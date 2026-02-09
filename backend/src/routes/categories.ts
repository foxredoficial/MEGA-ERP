import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { 
  createCategory, 
  listCategories, 
  getCategory, 
  updateCategory, 
  deleteCategory 
} from "../repos/categories.js";
import { asyncHandler } from "../http.js";
import { z } from "zod";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  parent_id: z.string().uuid().nullable().optional().or(z.literal("")),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const categories = await listCategories((req as AuthedRequest).auth.userId);
  res.json({ categories });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  try {
    const data = categorySchema.parse(req.body);
    // Convert empty string to null for parent_id
    if (data.parent_id === "") data.parent_id = null;
    
    const id = await createCategory((req as AuthedRequest).auth.userId, data as any);
    res.status(201).json({ id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const category = await getCategory((req as AuthedRequest).auth.userId, req.params.id);
  if (!category) {
    return res.status(404).json({ error: "Categoria não encontrada" });
  }
  res.json({ category });
}));

router.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    // Convert empty string to null for parent_id
    if (data.parent_id === "") data.parent_id = null;

    await updateCategory((req as AuthedRequest).auth.userId, req.params.id, data as any);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  await deleteCategory((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ success: true });
}));

export default router;
