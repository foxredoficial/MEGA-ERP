import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../http.js";
import { requireAdmin } from "../auth/requireAuth.js";
import { pool } from "../db.js";
import { createPlan, updatePlan, findPlanById } from "../repos/plans.js";
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
      `SELECT id, email, full_name, company_name, role, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
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
      `SELECT s.id, s.user_id, s.plan_id, s.status, s.started_at, s.ended_at, s.created_at,
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
      is_featured: body.data.is_featured,
      is_active: body.data.is_active,
    });

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
