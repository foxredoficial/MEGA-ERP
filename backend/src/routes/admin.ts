import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../http.js";
import { requireAdmin } from "../auth/requireAuth.js";
import { pool } from "../db.js";
import { createPlan, updatePlan, findPlanById } from "../repos/plans.js";
import { cancelActiveSubscriptionsForUser, createManualSubscription } from "../repos/subscriptions.js";
import { getAdminDashboardAnalytics } from "../repos/admin_analytics.js";
import { env } from "../env.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

function normalizeFeaturesJson(input: unknown) {
  if (Array.isArray(input)) return JSON.stringify(input.map((v) => String(v)));
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return JSON.stringify([]);
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.map((v) => String(v)));
      return JSON.stringify([]);
    } catch {
      return JSON.stringify([]);
    }
  }
  return JSON.stringify([]);
}

async function getSubscriptionById(id: string) {
  const [rows] = await pool.query<any[]>(
    "SELECT id, user_id, plan_id, status, mp_preapproval_id, started_at, ended_at, created_at, updated_at FROM subscriptions WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

function mapMpStatusToInternal(status: string | null | undefined): "active" | "canceled" | "past_due" {
  const s = (status ?? "").toLowerCase();
  if (s === "authorized") return "active";
  if (s === "cancelled" || s === "canceled") return "canceled";
  return "past_due";
}

async function fetchMpPreapproval(id: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");
  const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Falha ao consultar Mercado Pago: ${r.status}`);
  return (await r.json()) as any;
}

async function cancelMpPreapproval(id: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");
  const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Falha ao cancelar no Mercado Pago: ${r.status}`);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

adminRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [userCount] = await pool.query<any>("SELECT COUNT(*) as count FROM users");
    const [subscriptionCount] = await pool.query<any>("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'");
    
    // Get recent users
    const [recentUsers] = await pool.query<any>(
      "SELECT id, full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5"
    );

    res.json({
      users: userCount[0].count,
      activeSubscriptions: subscriptionCount[0].count,
      recentUsers: recentUsers
    });
  })
);

adminRouter.get(
  "/analytics/dashboard",
  asyncHandler(async (req, res) => {
    const start = String(req.query.start ?? "");
    const end = String(req.query.end ?? "");
    const granularity = String(req.query.granularity ?? "day");
    const compareStart = req.query.compareStart ? String(req.query.compareStart) : null;
    const compareEnd = req.query.compareEnd ? String(req.query.compareEnd) : null;

    if (!start || !end) {
      return res.status(400).json({ error: "start e end são obrigatórios (YYYY-MM-DD)" });
    }
    if (!["day", "week", "month"].includes(granularity)) {
      return res.status(400).json({ error: "granularity inválida" });
    }

    const compare = compareStart && compareEnd ? { start: compareStart, end: compareEnd } : undefined;
    const data = await getAdminDashboardAnalytics({
      range: { start, end },
      compare,
      granularity: granularity as any,
    });
    res.json(data);
  })
);

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(25),
        q: z.string().trim().optional(),
      })
      .safeParse(req.query);
    if (!q.success) return res.status(400).json({ error: q.error.flatten() });

    const page = q.data.page;
    const pageSize = q.data.pageSize;
    const offset = (page - 1) * pageSize;
    const term = q.data.q ? `%${q.data.q}%` : null;

    const where = term ? "WHERE (email LIKE ? OR full_name LIKE ? OR company_name LIKE ?)" : "";
    const params = term ? [term, term, term] : [];

    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as n FROM users ${where}`, params);
    const total = Number(countRows?.[0]?.n ?? 0);

    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.email, u.full_name, u.company_name, u.role, u.created_at,
        s.status as subscription_status, p.name as subscription_plan_name
       FROM users u
       LEFT JOIN (
         SELECT s1.*
         FROM subscriptions s1
         JOIN (
           SELECT user_id, MAX(created_at) as max_created
           FROM subscriptions
           GROUP BY user_id
         ) s2 ON s1.user_id = s2.user_id AND s1.created_at = s2.max_created
       ) s ON s.user_id = u.id
       LEFT JOIN plans p ON p.id = s.plan_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({ items: rows, page, pageSize, total });
  })
);

adminRouter.get(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(25),
        q: z.string().trim().optional(),
        status: z.string().trim().optional(),
      })
      .safeParse(req.query);
    if (!q.success) return res.status(400).json({ error: q.error.flatten() });

    const page = q.data.page;
    const pageSize = q.data.pageSize;
    const offset = (page - 1) * pageSize;
    const term = q.data.q ? `%${q.data.q}%` : null;
    const status = q.data.status && q.data.status !== "all" ? q.data.status : null;

    const whereParts: string[] = [];
    const params: any[] = [];
    if (term) {
      whereParts.push("(u.full_name LIKE ? OR u.email LIKE ? OR p.name LIKE ?)");
      params.push(term, term, term);
    }
    if (status) {
      whereParts.push("s.status = ?");
      params.push(status);
    }
    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as n
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       ${where}`,
      params
    );
    const total = Number(countRows?.[0]?.n ?? 0);

    const [rows] = await pool.query<any[]>(
      `SELECT s.id, s.user_id, s.plan_id, s.status, s.started_at, s.ended_at, s.created_at, s.mp_preapproval_id,
        u.full_name as user_name, u.email as user_email, p.name as plan_name
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({ items: rows, page, pageSize, total });
  })
);

adminRouter.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: params.error.flatten() });

    const body = z.object({ role: z.enum(["user", "admin"]) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const id = params.data.id;
    const nextRole = body.data.role;

    const [rows] = await pool.query<any[]>("SELECT id, role FROM users WHERE id = ? LIMIT 1", [id]);
    const current = rows?.[0];
    if (!current) return res.status(404).json({ error: "Usuário não encontrado" });

    const currentRole = String(current.role ?? "user");
    if (currentRole === "admin" && nextRole !== "admin") {
      const [admins] = await pool.query<any[]>("SELECT COUNT(*) as n FROM users WHERE role = 'admin'");
      const n = Number(admins?.[0]?.n ?? 0);
      if (n <= 1) return res.status(400).json({ error: "Não é possível remover o último admin." });
    }

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [nextRole, id]);
    res.json({ success: true });
  })
);

adminRouter.post(
  "/subscriptions/manual",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        planId: z.string().min(1),
        status: z.enum(["active", "canceled", "past_due"]).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const plan = await findPlanById(body.data.planId);
    if (!plan) return res.status(404).json({ error: "Plano não encontrado" });

    const status = body.data.status ?? "active";
    if (status === "active") {
      await cancelActiveSubscriptionsForUser(body.data.userId, new Date());
    }
    const endedAt = status === "canceled" ? new Date() : null;
    const id = await createManualSubscription({
      userId: body.data.userId,
      planId: plan.id,
      status,
      startedAt: new Date(),
      endedAt,
    });

    res.status(201).json({ id });
  })
);

adminRouter.post(
  "/subscriptions/:id/cancel",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: params.error.flatten() });

    const sub = await getSubscriptionById(params.data.id);
    if (!sub) return res.status(404).json({ error: "Assinatura não encontrada" });

    if (sub.mp_preapproval_id) {
      if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Mercado Pago não configurado." });
      await cancelMpPreapproval(sub.mp_preapproval_id);
    }

    const now = new Date();
    await pool.query(
      "UPDATE subscriptions SET status = 'canceled', ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE id = ?",
      [now, now, sub.id]
    );

    res.json({ success: true });
  })
);

adminRouter.post(
  "/subscriptions/:id/sync-mp",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: params.error.flatten() });

    const sub = await getSubscriptionById(params.data.id);
    if (!sub || !sub.mp_preapproval_id) return res.status(404).json({ error: "Assinatura não encontrada" });
    if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Mercado Pago não configurado." });

    const mp = await fetchMpPreapproval(sub.mp_preapproval_id);
    const status = mapMpStatusToInternal(mp?.status);
    const now = new Date();
    const endedAt = status === "canceled" ? now : null;
    const startedAt = status === "active" ? now : null;

    await pool.query(
      "UPDATE subscriptions SET status = ?, started_at = COALESCE(started_at, ?), ended_at = ?, updated_at = ? WHERE id = ?",
      [status, startedAt, endedAt, now, sub.id]
    );

    res.json({ success: true, status });
  })
);

adminRouter.patch(
  "/subscriptions/:id",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: params.error.flatten() });

    const body = z
      .object({
        status: z.enum(["active", "canceled", "past_due"]).optional(),
        planId: z.string().min(1).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const sub = await getSubscriptionById(params.data.id);
    if (!sub) return res.status(404).json({ error: "Assinatura não encontrada" });

    if (body.data.planId) {
      const plan = await findPlanById(body.data.planId);
      if (!plan) return res.status(404).json({ error: "Plano não encontrado" });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.data.planId) {
      updates.push("plan_id = ?");
      values.push(body.data.planId);
    }

    if (body.data.status) {
      const status = body.data.status;
      if (status === "active") {
        await cancelActiveSubscriptionsForUser(sub.user_id, new Date());
        updates.push("status = ?");
        values.push("active");
        updates.push("started_at = COALESCE(started_at, ?)");
        values.push(new Date());
        updates.push("ended_at = NULL");
      } else if (status === "canceled") {
        updates.push("status = ?");
        values.push("canceled");
        updates.push("ended_at = ?");
        values.push(new Date());
      } else {
        updates.push("status = ?");
        values.push("past_due");
        updates.push("ended_at = NULL");
      }
    }

    if (!updates.length) return res.status(400).json({ error: "Nada para atualizar" });

    updates.push("updated_at = ?");
    values.push(new Date());

    values.push(sub.id);
    await pool.query(`UPDATE subscriptions SET ${updates.join(", ")} WHERE id = ?`, values);

    res.json({ success: true });
  })
);

// --- Plans Routes ---

adminRouter.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(50),
        q: z.string().trim().optional(),
      })
      .safeParse(req.query);
    if (!q.success) return res.status(400).json({ error: q.error.flatten() });

    const page = q.data.page;
    const pageSize = q.data.pageSize;
    const offset = (page - 1) * pageSize;
    const term = q.data.q ? `%${q.data.q}%` : null;

    const where = term ? "WHERE (name LIKE ? OR description LIKE ?)" : "";
    const params = term ? [term, term] : [];

    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as n FROM plans ${where}`, params);
    const total = Number(countRows?.[0]?.n ?? 0);

    const [rows] = await pool.query<any[]>(
      `SELECT * FROM plans ${where}
       ORDER BY is_active DESC, is_featured DESC, price_cents ASC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({ items: rows, page, pageSize, total });
  })
);

adminRouter.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().trim().min(1).optional().nullable(),
        price_cents: z.coerce.number().int().min(0),
        features_json: z.union([z.array(z.string()), z.string()]).optional(),
        max_users: z.coerce.number().int().min(-1).optional(),
        max_products: z.coerce.number().int().min(-1).optional(),
        max_invoices: z.coerce.number().int().min(-1).optional(),
        mp_preapproval_plan_id: z.string().trim().min(1).optional().nullable(),
        trial_enabled: z.coerce.boolean().optional(),
        trial_days: z.coerce.number().int().min(1).max(365).optional(),
        is_featured: z.coerce.boolean().optional(),
        is_active: z.coerce.boolean().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const id = await createPlan({
      name: body.data.name,
      description: body.data.description ?? undefined,
      price_cents: body.data.price_cents,
      features_json: normalizeFeaturesJson(body.data.features_json),
      max_users: body.data.max_users ?? 1,
      max_products: body.data.max_products ?? 100,
      max_invoices: body.data.max_invoices ?? 50,
      mp_preapproval_plan_id: body.data.mp_preapproval_plan_id ?? null,
      trial_enabled: Boolean(body.data.trial_enabled),
      trial_days: body.data.trial_days ?? 7,
      is_featured: Boolean(body.data.is_featured),
      is_active: body.data.is_active !== undefined ? Boolean(body.data.is_active) : true,
    });

    res.status(201).json({ id });
  })
);

adminRouter.put(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: params.error.flatten() });
    const { id } = params.data;

    const body = z
      .object({
        name: z.string().min(1).optional(),
        description: z.string().trim().min(1).optional().nullable(),
        price_cents: z.coerce.number().int().min(0).optional(),
        features_json: z.union([z.array(z.string()), z.string()]).optional(),
        max_users: z.coerce.number().int().min(-1).optional(),
        max_products: z.coerce.number().int().min(-1).optional(),
        max_invoices: z.coerce.number().int().min(-1).optional(),
        mp_preapproval_plan_id: z.string().trim().min(1).optional().nullable(),
        trial_enabled: z.coerce.boolean().optional(),
        trial_days: z.coerce.number().int().min(1).max(365).optional(),
        is_featured: z.coerce.boolean().optional(),
        is_active: z.coerce.boolean().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const plan = await findPlanById(id);
    if (!plan) return res.status(404).json({ error: "Plano não encontrado" });

    await updatePlan(id, {
      name: body.data.name,
      description: body.data.description ?? undefined,
      price_cents: body.data.price_cents,
      features_json: body.data.features_json !== undefined ? normalizeFeaturesJson(body.data.features_json) : undefined,
      max_users: body.data.max_users,
      max_products: body.data.max_products,
      max_invoices: body.data.max_invoices,
      mp_preapproval_plan_id: body.data.mp_preapproval_plan_id ?? undefined,
      trial_enabled: body.data.trial_enabled,
      trial_days: body.data.trial_days,
      is_featured: body.data.is_featured,
      is_active: body.data.is_active,
    });

    res.json({ success: true });
  })
);

adminRouter.delete(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: params.error.flatten() });
    const { id } = params.data;

    const plan = await findPlanById(id);
    if (!plan) return res.status(404).json({ error: "Plano não encontrado" });

    const [rows] = await pool.query<any[]>(
      "SELECT COUNT(*) as n FROM subscriptions WHERE plan_id = ? AND status IN ('active','past_due')",
      [id]
    );
    const n = Number(rows?.[0]?.n ?? 0);
    if (n > 0) {
      return res.status(400).json({
        message: "Não é possível excluir um plano com assinaturas ativas.",
        error: "Não é possível excluir um plano com assinaturas ativas.",
      });
    }

    await pool.query("DELETE FROM subscriptions WHERE plan_id = ? AND status = 'canceled'", [id]);
    await pool.query("DELETE FROM plans WHERE id = ?", [id]);
    res.json({ success: true });
  })
);

adminRouter.get(
  "/integrations/mercadopago",
  asyncHandler(async (_req, res) => {
    res.json({
      configured: {
        accessToken: Boolean(env.MP_ACCESS_TOKEN),
        publicKey: Boolean(env.MP_PUBLIC_KEY),
        webhookBaseUrl: Boolean(env.WEBHOOK_BASE_URL),
        signatureSecret: Boolean(env.MP_WEBHOOK_SIGNATURE_SECRET),
      },
    });
  })
);
