import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { createPdvSale, listPdvSales } from "../repos/pdv_sales.js";

const router = Router();

router.get("/sales", requireAuth, asyncHandler(async (req, res) => {
  const q = z.object({ query: z.string().optional() }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const sales = await listPdvSales((req as AuthedRequest).auth.userId, q.data);
  res.json({ sales });
}));

router.post("/sales", requireAuth, asyncHandler(async (req, res) => {
  const itemSchema = z.object({
    id: z.string().uuid().optional(),
    productId: z.string().uuid(),
    name: z.string().min(1),
    sku: z.string().nullable().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discountPerUnit: z.number().min(0),
    lineTotal: z.number().min(0),
    lotId: z.string().uuid().nullable().optional(),
  });

  const body = z
    .object({
      cashSessionId: z.string().uuid(),
      customerId: z.string().uuid().nullable().optional(),
      customerName: z.string().nullable().optional(),
      paymentMethod: z.string().min(1),
      subtotal: z.number().min(0),
      discount: z.number().min(0),
      total: z.number().min(0),
      status: z.enum(["completed", "canceled"]),
      items: z.array(itemSchema),
      opts: z.object({ id: z.string().uuid().optional(), createdAt: z.string().optional() }).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const { opts, ...payload } = body.data;
  const sale = await createPdvSale((req as AuthedRequest).auth.userId, payload as any, opts);
  res.status(201).json({ sale });
}));

export default router;
