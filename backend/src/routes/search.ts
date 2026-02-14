import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../http.js";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { getTenantPool } from "../db_tenant.js";

const router = Router();

function escapeLike(input: string) {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.json({ q: "", results: {} });

    const userId = (req as AuthedRequest).auth.userId;
    const pool = await getTenantPool(userId);

    const q = parsed.data.q;
    const like = `%${escapeLike(q)}%`;

    const [productsRows] = await pool.query<any[]>(
      `SELECT id, name, sku, type
       FROM products
       WHERE user_id = ? AND (
        name LIKE ? ESCAPE '\\'
        OR sku LIKE ? ESCAPE '\\'
        OR gtin LIKE ? ESCAPE '\\'
        OR gtin_tax LIKE ? ESCAPE '\\'
       )
       ORDER BY created_at DESC
       LIMIT 8`,
      [userId, like, like, like, like]
    );

    const [contactsRows] = await pool.query<any[]>(
      `SELECT id, name, fantasy_name, cpf_cnpj, email, contact_type
       FROM contacts
       WHERE user_id = ? AND (
         name LIKE ? ESCAPE '\\'
         OR fantasy_name LIKE ? ESCAPE '\\'
         OR cpf_cnpj LIKE ? ESCAPE '\\'
         OR email LIKE ? ESCAPE '\\'
       )
       ORDER BY created_at DESC
       LIMIT 8`,
      [userId, like, like, like, like]
    );

    const [salesOrdersRows] = await pool.query<any[]>(
      `SELECT id, number, customer_name, status, date
       FROM sales_orders
       WHERE user_id = ? AND (number LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\')
       ORDER BY date DESC
       LIMIT 8`,
      [userId, like, like]
    );

    const [serviceOrdersRows] = await pool.query<any[]>(
      `SELECT id, number, customer_name, status, date
       FROM service_orders
       WHERE user_id = ? AND (number LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\')
       ORDER BY date DESC
       LIMIT 8`,
      [userId, like, like]
    );

    const [docsRows] = await pool.query<any[]>(
      `SELECT id, type, number, party_name, status, date
       FROM biz_documents
       WHERE user_id = ? AND (
         number LIKE ? ESCAPE '\\'
         OR party_name LIKE ? ESCAPE '\\'
         OR notes LIKE ? ESCAPE '\\'
       )
       ORDER BY date DESC
       LIMIT 8`,
      [userId, like, like, like]
    );

    res.json({
      q,
      results: {
        products: productsRows,
        contacts: contactsRows,
        salesOrders: salesOrdersRows,
        serviceOrders: serviceOrdersRows,
        documents: docsRows,
      },
    });
  })
);

export default router;
