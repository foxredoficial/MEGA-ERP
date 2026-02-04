import { Router } from "express";
import { asyncHandler } from "../http.js";
import { requireAdmin } from "../auth/requireAuth.js";
import { pool } from "../db.js";
import { listAllPlans, createPlan, updatePlan, findPlanById } from "../repos/plans.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

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
  "/users",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT id, email, full_name, company_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 50");
    res.json(rows);
  })
);

adminRouter.get(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT s.*, u.full_name as user_name, u.email as user_email, p.name as plan_name 
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  })
);

adminRouter.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== "user" && role !== "admin") {
      return res.status(400).json({ error: "Role inválida" });
    }

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    res.json({ success: true });
  })
);

// --- Plans Routes ---

adminRouter.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const plans = await listAllPlans();
    res.json(plans);
  })
);

adminRouter.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const { name, price_cents, features_json, max_users, max_products, max_invoices, is_featured, is_active } = req.body;
    
    if (!name || price_cents === undefined) {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const id = await createPlan({
      name,
      price_cents,
      features_json: typeof features_json === 'string' ? features_json : JSON.stringify(features_json || []),
      max_users: max_users || 1,
      max_products: max_products || 100,
      max_invoices: max_invoices || 50,
      is_featured: !!is_featured,
      is_active: is_active !== undefined ? !!is_active : true
    });

    res.status(201).json({ id });
  })
);

adminRouter.put(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, price_cents, features_json, max_users, max_products, max_invoices, is_featured, is_active } = req.body;

    const plan = await findPlanById(id);
    if (!plan) return res.status(404).json({ error: "Plano não encontrado" });

    await updatePlan(id, {
      name,
      description,
      price_cents,
      features_json: features_json !== undefined ? (typeof features_json === 'string' ? features_json : JSON.stringify(features_json)) : undefined,
      max_users,
      max_products,
      max_invoices,
      is_featured,
      is_active
    });

    res.json({ success: true });
  })
);
