import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import {
  createCoaAccount,
  createFinCategory,
  createFinCostCenter,
  listCoaAccounts,
  listFinCategories,
  listFinCostCenters,
  updateCoaAccount,
  updateFinCategory,
  updateFinCostCenter,
} from "../repos/finance_config.js";
import { getCashflow, getDre } from "../repos/finance_reports.js";

const router = Router();

router.get("/categories", requireAuth, asyncHandler(async (req, res) => {
  const categories = await listFinCategories((req as AuthedRequest).auth.userId);
  res.json({ categories });
}));

router.post("/categories", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      name: z.string().min(2),
      type: z.enum(["income", "expense", "transfer", "other"]),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const category = await createFinCategory((req as AuthedRequest).auth.userId, (req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ category });
}));

router.put("/categories/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      name: z.string().min(2),
      type: z.enum(["income", "expense", "transfer", "other"]),
      active: z.boolean(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const category = await updateFinCategory((req as AuthedRequest).auth.userId, (req as AuthedRequest).auth.userId, req.params.id, body.data);
  res.json({ category });
}));

router.get("/cost-centers", requireAuth, asyncHandler(async (req, res) => {
  const costCenters = await listFinCostCenters((req as AuthedRequest).auth.userId);
  res.json({ costCenters });
}));

router.post("/cost-centers", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(2) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const costCenter = await createFinCostCenter((req as AuthedRequest).auth.userId, (req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ costCenter });
}));

router.put("/cost-centers/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(2), active: z.boolean() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const costCenter = await updateFinCostCenter((req as AuthedRequest).auth.userId, (req as AuthedRequest).auth.userId, req.params.id, body.data);
  res.json({ costCenter });
}));

router.get("/coa-accounts", requireAuth, asyncHandler(async (req, res) => {
  const accounts = await listCoaAccounts((req as AuthedRequest).auth.userId);
  res.json({ accounts });
}));

router.post("/coa-accounts", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      code: z.string().min(1),
      name: z.string().min(2),
      nature: z.enum(["revenue", "expense", "asset", "liability", "equity"]),
      parentId: z.string().uuid().nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const account = await createCoaAccount((req as AuthedRequest).auth.userId, (req as AuthedRequest).auth.userId, body.data);
  res.status(201).json({ account });
}));

router.put("/coa-accounts/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = z
    .object({
      code: z.string().min(1),
      name: z.string().min(2),
      nature: z.enum(["revenue", "expense", "asset", "liability", "equity"]),
      parentId: z.string().uuid().nullable().optional(),
      active: z.boolean(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const account = await updateCoaAccount((req as AuthedRequest).auth.userId, (req as AuthedRequest).auth.userId, req.params.id, body.data);
  res.json({ account });
}));

router.get("/cashflow", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      start: z.string().min(10),
      end: z.string().min(10),
      accountId: z.string().uuid().optional(),
      onlyReconciled: z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .transform((v) => (v ? v === "true" : undefined)),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const points = await getCashflow((req as AuthedRequest).auth.userId, {
    start: q.data.start,
    end: q.data.end,
    accountId: q.data.accountId ?? null,
    onlyReconciled: q.data.onlyReconciled ?? false,
  });
  res.json({ points });
}));

router.get("/dre", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      start: z.string().min(10),
      end: z.string().min(10),
      view: z.enum(["competence", "cash"]).default("competence"),
      costCenterId: z.string().uuid().optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const rows = await getDre((req as AuthedRequest).auth.userId, {
    start: q.data.start,
    end: q.data.end,
    view: q.data.view,
    costCenterId: q.data.costCenterId ?? null,
  });
  const revenue = rows.filter((r) => r.nature === "revenue").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.nature === "expense").reduce((s, r) => s + r.amount, 0);
  res.json({ rows, totals: { revenue, expense, result: revenue - expense } });
}));

export const financeRouter = router;

