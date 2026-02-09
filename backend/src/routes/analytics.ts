import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { getDashboardAnalytics, type AnalyticsGranularity } from "../repos/analytics.js";

const router = Router();

router.get("/dashboard", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      start: z.string().min(1),
      end: z.string().min(1),
      granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
      compareStart: z.string().min(1).optional(),
      compareEnd: z.string().min(1).optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });

  const granularity = q.data.granularity as AnalyticsGranularity;
  const payload = await getDashboardAnalytics((req as AuthedRequest).auth.userId, {
    range: { start: q.data.start, end: q.data.end },
    compare: q.data.compareStart && q.data.compareEnd ? { start: q.data.compareStart, end: q.data.compareEnd } : undefined,
    granularity,
  });
  res.json(payload);
}));

export default router;
