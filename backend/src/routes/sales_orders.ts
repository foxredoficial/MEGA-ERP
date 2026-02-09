import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { cancelSalesOrder, createSalesOrder, getSalesOrder, listSalesOrders, updateSalesOrder } from "../repos/sales_orders.js";

const router = Router();

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
});

const orderSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["open", "billed", "delivered", "canceled"]),
  observations: z.string().default(""),
  items: z.array(itemSchema),
});

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const orders = await listSalesOrders((req as AuthedRequest).auth.userId);
  res.json({ orders });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await getSalesOrder((req as AuthedRequest).auth.userId, req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ order });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const body = orderSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const order = await createSalesOrder((req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ order });
}));

router.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = orderSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const order = await updateSalesOrder((req as AuthedRequest).auth.userId, req.params.id, body.data);
  res.json({ order });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await cancelSalesOrder((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ order });
}));

export default router;
