import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import {
  addCashTransaction,
  closeCashSession,
  getCashSession,
  getCurrentOpenCashSession,
  listCashSessions,
  openCashSession,
} from "../repos/cash.js";

const router = Router();

router.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await listCashSessions((req as AuthedRequest).auth.userId);
  res.json({ sessions });
});

router.get("/current", requireAuth, async (req, res) => {
  const session = await getCurrentOpenCashSession((req as AuthedRequest).auth.userId);
  res.json({ session });
});

router.get("/sessions/:id", requireAuth, async (req, res) => {
  const session = await getCashSession((req as AuthedRequest).auth.userId, req.params.id);
  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });
  res.json({ session });
});

router.post("/sessions", requireAuth, async (req, res) => {
  const body = z.object({ openingBalance: z.number().min(0), userName: z.string().nullable().optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const session = await openCashSession(
    (req as AuthedRequest).auth.userId,
    body.data.userName ?? null,
    body.data.openingBalance
  );
  res.status(201).json({ session });
});

router.post("/sessions/:id/close", requireAuth, async (req, res) => {
  const body = z
    .object({ closingBalance: z.number().min(0), notes: z.string().nullable().optional() })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const session = await closeCashSession(
    (req as AuthedRequest).auth.userId,
    req.params.id,
    body.data.closingBalance,
    body.data.notes ?? null
  );
  res.json({ session });
});

router.post("/sessions/:id/transactions", requireAuth, async (req, res) => {
  const body = z
    .object({
      type: z.enum(["in", "out"]),
      category: z.enum(["opening", "closing", "sale", "receipt", "payment", "supply", "bleed", "expense"]),
      amount: z.number().positive(),
      description: z.string().min(1),
      paymentMethod: z.string().min(1),
      refId: z.string().uuid().nullable().optional(),
      meta: z.record(z.unknown()).nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const transaction = await addCashTransaction({
    userId: (req as AuthedRequest).auth.userId,
    sessionId: req.params.id,
    type: body.data.type,
    category: body.data.category,
    amount: body.data.amount,
    description: body.data.description,
    paymentMethod: body.data.paymentMethod,
    refId: body.data.refId ?? null,
    meta: body.data.meta ?? null,
  });

  res.status(201).json({ transaction });
});

export default router;

