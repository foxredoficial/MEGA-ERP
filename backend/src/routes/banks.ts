import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { addBankTransaction, createBankAccount, deleteBankAccount, getBankAccount, listBankAccounts, listBankTransactions, updateBankAccount } from "../repos/banks.js";

const router = Router();

router.get("/accounts", requireAuth, asyncHandler(async (req, res) => {
  const accounts = await listBankAccounts((req as AuthedRequest).auth.userId);
  res.json({ accounts });
}));

router.get("/accounts/:id", requireAuth, asyncHandler(async (req, res) => {
  const account = await getBankAccount((req as AuthedRequest).auth.userId, req.params.id);
  if (!account) return res.status(404).json({ error: "Conta não encontrada" });
  res.json({ account });
}));

router.post("/accounts", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      name: z.string().min(2),
      bank: z.string().optional().nullable(),
      agency: z.string().optional().nullable(),
      accountNumber: z.string().optional().nullable(),
      initialBalance: z.number().min(0).default(0),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const account = await createBankAccount((req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ account });
}));

router.put("/accounts/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      name: z.string().min(2),
      bank: z.string().optional().nullable(),
      agency: z.string().optional().nullable(),
      accountNumber: z.string().optional().nullable(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const account = await updateBankAccount((req as AuthedRequest).auth.userId, req.params.id, body.data);
  res.json({ account });
}));

router.delete("/accounts/:id", requireAuth, asyncHandler(async (req, res) => {
  await deleteBankAccount((req as AuthedRequest).auth.userId, req.params.id);
  res.status(204).send();
}));

router.get("/accounts/:id/transactions", requireAuth, asyncHandler(async (req, res) => {
  const txs = await listBankTransactions((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ transactions: txs });
}));

router.post("/accounts/:id/transactions", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      type: z.enum(["in", "out"]),
      amount: z.number().positive(),
      description: z.string().min(2),
      occurredAt: z.string().min(1),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const id = await addBankTransaction((req as AuthedRequest).auth.userId, {
    accountId: req.params.id,
    ...body.data,
  });
  res.status(201).json({ id });
}));

export default router;
