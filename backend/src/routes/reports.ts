import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { listReportDefinitions, runReport } from "../repos/reports.js";

const router = Router();

router.get("/definitions", requireAuth, asyncHandler(async (_req, res) => {
  const defs = await listReportDefinitions();
  res.json({ reports: defs });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      start: z.string().min(1).optional(),
      end: z.string().min(1).optional(),
      status: z.string().optional(),
      kind: z.string().optional(),
      query: z.string().optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });

  const reportId = String(req.params.id);
  const start = q.data.start ?? new Date().toISOString().slice(0, 10);
  const end = q.data.end ?? new Date().toISOString().slice(0, 10);

  const data = await runReport((req as AuthedRequest).auth.userId, reportId, {
    start,
    end,
    status: q.data.status,
    kind: q.data.kind,
    query: q.data.query,
  });

  res.json({ report: data });
}));

export default router;
