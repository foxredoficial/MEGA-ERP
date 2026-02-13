import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { getDashboardAnalytics, getTopProducts, type AnalyticsGranularity } from "../repos/analytics.js";

const router = Router();

router.get("/dashboard", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      start: z.string().min(1),
      end: z.string().min(1),
      granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
      compareStart: z.string().min(1).optional(),
      compareEnd: z.string().min(1).optional(),
      productsMetric: z.enum(["total", "qty"]).optional(),
      productsOrder: z.enum(["top", "bottom"]).optional(),
      productsLimit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });

  const granularity = q.data.granularity as AnalyticsGranularity;
  const payload = await getDashboardAnalytics((req as AuthedRequest).auth.userId, {
    range: { start: q.data.start, end: q.data.end },
    compare: q.data.compareStart && q.data.compareEnd ? { start: q.data.compareStart, end: q.data.compareEnd } : undefined,
    granularity,
    topProducts: {
      metric: q.data.productsMetric ?? "total",
      order: q.data.productsOrder ?? "top",
      limit: q.data.productsLimit ?? 10,
    },
  });
  res.json(payload);
}));

router.get("/top-products", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      start: z.string().min(1),
      end: z.string().min(1),
      productsMetric: z.enum(["total", "qty"]).default("total"),
      productsOrder: z.enum(["top", "bottom"]).default("top"),
      productsLimit: z.coerce.number().int().min(1).max(200).default(10),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });

  const list = await getTopProducts((req as AuthedRequest).auth.userId, {
    range: { start: q.data.start, end: q.data.end },
    topProducts: { metric: q.data.productsMetric, order: q.data.productsOrder, limit: q.data.productsLimit },
  });
  res.json({ items: list });
}));

export default router;
