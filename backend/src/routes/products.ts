import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { 
  createProduct, 
  listProducts, 
  getProduct, 
  getProductVariations,
  updateProduct, 
  deleteProduct 
} from "../repos/products.js";
import { addStockMovement, getStockHistory } from "../repos/stock.js";
import { createLot, updateLot, listLots, deleteLot } from "../repos/lots.js";
import { z } from "zod";

const router = Router();

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().nullable().optional(),
  price: z.number().min(0).optional(),
  cost_price: z.number().min(0).optional(),
  unit: z.string().optional(),
  format: z.enum(['simple', 'variation']).optional(),
  type: z.enum(['product', 'service']).optional(),
  condition_type: z.enum(['new', 'used', 'not_specified']).optional(),
  category_id: z.string().uuid().nullable().optional(),
  brand: z.string().nullable().optional(),
  weight_net: z.number().nullable().optional(),
  weight_gross: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  depth: z.number().nullable().optional(),
  volumes: z.number().nullable().optional(),
  items_per_box: z.number().nullable().optional(),
  gtin: z.string().nullable().optional(),
  gtin_tax: z.string().nullable().optional(),
  description_short: z.string().nullable().optional(),
  description_complementary: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  external_link: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
  stock: z.number().optional(),
  stock_min: z.number().optional(),
  stock_max: z.number().optional(),
  crossdocking: z.number().optional(),
  location: z.string().nullable().optional(),
  ncm: z.string().nullable().optional(),
  cest: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  item_type: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  has_lot_control: z.boolean().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const products = await listProducts((req as AuthedRequest).auth.userId);
  res.json({ products });
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = productSchema.parse(req.body);
    const id = await createProduct((req as AuthedRequest).auth.userId, data as any);
    res.status(201).json({ id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const product = await getProduct((req as AuthedRequest).auth.userId, req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  res.json({ product });
});

router.get("/:id/variations", requireAuth, async (req, res) => {
  const variations = await getProductVariations((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ variations });
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const data = productSchema.partial().parse(req.body);
    await updateProduct((req as AuthedRequest).auth.userId, req.params.id, data as any);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  await deleteProduct((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ success: true });
});

// Stock & Lots

const stockMovementSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().min(0.001, "Quantidade deve ser maior que 0"),
  reason: z.string().optional(),
  lot_id: z.string().uuid().optional()
});

router.get("/:id/stock", requireAuth, async (req, res) => {
  const product = await getProduct((req as AuthedRequest).auth.userId, req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  const history = await getStockHistory((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ history });
});

router.post("/:id/stock", requireAuth, async (req, res) => {
  const product = await getProduct((req as AuthedRequest).auth.userId, req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  
  try {
    const data = stockMovementSchema.parse(req.body);
    const id = await addStockMovement(
      req.params.id, 
      (req as AuthedRequest).auth.userId, 
      data.type, 
      data.quantity, 
      data.reason || "",
      data.lot_id
    );
    res.status(201).json({ id });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    // Handle specific business logic errors
    if (e.message.includes("controle de lote") || e.message.includes("Lot not found")) {
        return res.status(400).json({ error: e.message });
    }
    throw e;
  }
});

// Lots Routes

const lotSchema = z.object({
  code: z.string().min(1, "Código do lote é obrigatório"),
  manufacturing_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

router.get("/:id/lots", requireAuth, async (req, res) => {
  const includeInactive = req.query.include_inactive === 'true';
  const lots = await listLots((req as AuthedRequest).auth.userId, req.params.id, includeInactive);
  res.json({ lots });
});

router.post("/:id/lots", requireAuth, async (req, res) => {
  try {
    const data = lotSchema.parse(req.body);
    const id = await createLot((req as AuthedRequest).auth.userId, {
      product_id: req.params.id,
      code: data.code,
      manufacturing_date: data.manufacturing_date,
      expiration_date: data.expiration_date,
      observations: data.observations
    });
    res.status(201).json({ id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.put("/:id/lots/:lotId", requireAuth, async (req, res) => {
  try {
    const data = lotSchema.partial().parse(req.body);
    await updateLot((req as AuthedRequest).auth.userId, req.params.lotId, data);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
});

router.delete("/:id/lots/:lotId", requireAuth, async (req, res) => {
  const result = await deleteLot((req as AuthedRequest).auth.userId, req.params.lotId);
  res.json(result);
});

export default router;
