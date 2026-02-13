import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { sendError } from "../http.js";
import { getPlanEntitlements, hasFeature, countUserProducts } from "./entitlements.js";
import { getSessionFromRequest } from "../auth/session.js";

export type EntitlementOptions = {
  feature?: string;
  limit?: "products";
};

export function requireEntitlement(opts: EntitlementOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!env.BILLING_ENFORCE_SUBSCRIPTION) return next();

      let auth = (req as any).auth as { userId: string; email?: string; role?: string } | undefined;
      if (!auth?.userId) {
        const session = await getSessionFromRequest(req);
        if (!session) return sendError(res, 401, "Não autenticado.");
        auth = session;
        (req as any).auth = { ...session, role: (session as any).role || "user" };
      }
      if (auth.role === "admin") return next();

      const { subscription, entitlements } = await getPlanEntitlements(auth.userId);
      if (!subscription || subscription.status !== "active") {
        return sendError(res, 402, "Assinatura necessária para usar este recurso.", {
          subscription: subscription ? { status: subscription.status } : null,
        });
      }

      if (opts.feature) {
        const feature = opts.feature;
        const ok = hasFeature(entitlements, feature) || hasFeature(entitlements, `app:${feature}`) || hasFeature(entitlements, `feature:${feature}`);
        if (!ok) return sendError(res, 403, "Seu plano não inclui este recurso.", { feature });
      }

      if (opts.limit === "products") {
        const plan = entitlements?.plan;
        const max = plan ? Number(plan.max_products) : -1;
        if (Number.isFinite(max) && max >= 0) {
          const count = await countUserProducts(auth.userId);
          if (count >= max) {
            return sendError(res, 402, "Limite de produtos do plano atingido.", { limit: max, current: count });
          }
        }
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}
