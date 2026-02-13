import { Router } from "express";
import { asyncHandler } from "../http.js";
import { listActivePlans } from "../repos/plans.js";
import { isEntitlementKey } from "../billing/featureKeys.js";

export const publicRouter = Router();

publicRouter.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await listActivePlans();
    const normalized = plans.map((p) => {
      let features: string[] = [];
      try {
        const parsed = JSON.parse(p.features_json);
        if (Array.isArray(parsed)) features = parsed.filter((x) => typeof x === "string" && !isEntitlementKey(x));
      } catch {
        features = [];
      }
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceCents: p.price_cents,
        billingInterval: "month" as const,
        features,
        isFeatured: Boolean(p.is_featured),
      };
    });

    res.json({ plans: normalized });
  })
);
