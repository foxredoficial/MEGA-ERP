import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import {
  createSalesperson,
  deleteSalesperson,
  getSalesperson,
  listSalespersons,
  updateSalesperson,
} from "../repos/salespersons.js";

const router = Router();

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  commission_rate: z.number().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  observations: z.string().nullable().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const salespersons = await listSalespersons((req as AuthedRequest).auth.userId);
  res.json({ salespersons });
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = schema.parse(req.body);
    const id = await createSalesperson((req as AuthedRequest).auth.userId, {
      ...data,
      email: data.email === "" ? null : (data.email ?? null),
    });
    res.status(201).json({ id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const salesperson = await getSalesperson((req as AuthedRequest).auth.userId, req.params.id);
  if (!salesperson) {
    return res.status(404).json({ error: "Vendedor não encontrado" });
  }
  res.json({ salesperson });
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const data = schema.partial().parse(req.body);
    await updateSalesperson((req as AuthedRequest).auth.userId, req.params.id, {
      ...data,
      email: data.email === "" ? null : data.email,
    } as any);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  await deleteSalesperson((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ success: true });
});

export default router;

