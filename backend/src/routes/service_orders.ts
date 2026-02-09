import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { cancelServiceOrder, createServiceOrder, getServiceOrder, listServiceOrders, updateServiceOrder } from "../repos/service_orders.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      query: z.string().optional(),
      status: z.enum(["open", "in_progress", "completed", "canceled"]).optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const orders = await listServiceOrders((req as AuthedRequest).auth.userId, q.data);
  res.json({ orders });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await getServiceOrder((req as AuthedRequest).auth.userId, req.params.id);
  if (!order) return res.status(404).json({ error: "OS não encontrada" });
  res.json({ order });
}));

const bodySchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  customerName: z.string().min(2),
  date: z.string().min(1),
  status: z.enum(["open", "in_progress", "completed", "canceled"]),
  description: z.string().min(2),
  totalCents: z.number().int().min(0),
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        kind: z.enum(["labor", "part", "service", "fee"]),
        productId: z.string().uuid().nullable().default(null),
        description: z.string().min(1),
        quantity: z.number().min(0),
        unitPrice: z.number().min(0),
        discount: z.number().min(0),
        total: z.number().min(0),
      })
    )
    .optional(),
});

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const body = bodySchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const order = await createServiceOrder((req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ order });
}));

router.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = bodySchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const order = await updateServiceOrder((req as AuthedRequest).auth.userId, req.params.id, body.data);
  res.json({ order });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await cancelServiceOrder((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ order });
}));

export default router;
