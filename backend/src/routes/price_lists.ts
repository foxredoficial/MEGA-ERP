
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { 
  createPriceList, 
  listPriceLists, 
  getPriceList, 
  updatePriceList, 
  deletePriceList 
} from "../repos/price_lists.js";
import { z } from "zod";

const router = Router();

const priceListSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['percentage', 'fixed_value', 'custom']),
  adjustment_type: z.enum(['increase', 'decrease']).nullable().optional(),
  adjustment_value: z.number().nullable().optional(),
  start_date: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  end_date: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  status: z.enum(['active', 'inactive']).default('active'),
  items: z.array(z.object({
    product_id: z.string(),
    price: z.number().nullable().optional()
  })).optional()
});

router.get("/", requireAuth, async (req, res) => {
  const lists = await listPriceLists((req as AuthedRequest).auth.userId);
  res.json({ lists });
});

router.get("/:id", requireAuth, async (req, res) => {
  const list = await getPriceList((req as AuthedRequest).auth.userId, req.params.id);
  if (!list) {
    return res.status(404).json({ error: "Lista de preços não encontrada" });
  }
  res.json({ list });
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = priceListSchema.parse(req.body);
    const id = await createPriceList((req as AuthedRequest).auth.userId, data as any);
    res.status(201).json({ id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const data = priceListSchema.partial().parse(req.body);
    await updatePriceList((req as AuthedRequest).auth.userId, req.params.id, data as any);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  await deletePriceList((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ success: true });
});

export default router;
