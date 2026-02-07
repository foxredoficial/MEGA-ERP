import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import {
  cancelFinancialTitle,
  createFinancialTitle,
  getFinancialTitle,
  listFinancialTitles,
  registerPayment,
} from "../repos/financial_titles.js";

const router = Router();

router.get("/titles", requireAuth, async (req, res) => {
  const q = z
    .object({
      kind: z.enum(["ar", "ap"]).optional(),
      status: z.enum(["open", "partial", "paid", "canceled"]).optional(),
      query: z.string().optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const titles = await listFinancialTitles((req as AuthedRequest).auth.userId, q.data);
  res.json({ titles });
});

router.get("/titles/:id", requireAuth, async (req, res) => {
  const title = await getFinancialTitle((req as AuthedRequest).auth.userId, req.params.id);
  if (!title) return res.status(404).json({ error: "Título não encontrado" });
  res.json({ title });
});

router.post("/titles", requireAuth, async (req, res) => {
  const body = z
    .object({
      kind: z.enum(["ar", "ap"]),
      origin: z.enum(["pdv", "sales_order", "manual"]),
      refId: z.string().uuid().nullable().optional(),
      partyId: z.string().uuid().nullable().optional(),
      partyName: z.string().nullable().optional(),
      description: z.string().min(1),
      amount: z.number().positive(),
      dueDate: z.string().min(1),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const title = await createFinancialTitle((req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ title });
});

router.post("/titles/:id/payments", requireAuth, async (req, res) => {
  const body = z
    .object({
      amount: z.number().positive(),
      method: z.enum(["money", "pix", "credit", "debit", "boleto", "crediario", "other"]),
      paidAt: z.string().optional(),
      notes: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const title = await registerPayment((req as AuthedRequest).auth.userId, {
    titleId: req.params.id,
    ...body.data,
  });
  res.json({ title });
});

router.post("/titles/:id/cancel", requireAuth, async (req, res) => {
  const title = await cancelFinancialTitle((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ title });
});

export default router;

