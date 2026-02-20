import { Router } from "express";
import { z } from "zod";
import { asyncHandler, sendError } from "../http.js";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { findUserById, updateUserPassword, updateUserProfile, updateUserPreferences } from "../repos/users.js";
import { getSubscriptionByUserId } from "../repos/subscriptions.js";
import { findPlanById } from "../repos/plans.js";
import bcrypt from "bcryptjs";
import { sanitizePreferencesForClient } from "../security/sanitize.js";
import { env } from "../env.js";
import { isEntitlementKey } from "../billing/featureKeys.js";

export const meRouter = Router();

meRouter.put(
  "/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body =
      z
        .object({
          theme: z.enum(["light", "dark"]).optional(),
          fiscal: z
            .object({
              environment: z.enum(["homolog", "prod"]).optional(),
            })
            .partial()
            .optional(),
        })
        .safeParse(req.body);

    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const user = await findUserById(r.auth.userId);
    if (!user) return sendError(res, 401, "Usuário não encontrado.");

    const currentPrefs = typeof user.preferences === "object" && user.preferences ? user.preferences : {};
    const nextFiscal = body.data.fiscal ? { ...(currentPrefs as any).fiscal, ...body.data.fiscal } : (currentPrefs as any).fiscal;
    const newPrefs = { ...currentPrefs, ...body.data, fiscal: nextFiscal };

    await updateUserPreferences(user.id, newPrefs);

    res.json({ ok: true, preferences: sanitizePreferencesForClient(newPrefs) });
  })
);

meRouter.put(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const user = await findUserById(r.auth.userId);
    if (!user) return sendError(res, 401, "Sessão inválida.");

    if (user.has_password) {
      const body = z
        .object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8),
        })
        .safeParse(req.body);

      if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

      const match = await bcrypt.compare(body.data.currentPassword, user.password_hash);
      if (!match) return sendError(res, 403, "Senha atual incorreta.");

      const newHash = await bcrypt.hash(body.data.newPassword, 12);
      await updateUserPassword(user.id, newHash);
    } else {
      const body = z
        .object({
          newPassword: z.string().min(8),
        })
        .safeParse(req.body);

      if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

      const newHash = await bcrypt.hash(body.data.newPassword, 12);
      await updateUserPassword(user.id, newHash);
    }

    res.json({ ok: true });
  })
);

meRouter.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body = z
      .object({
        fullName: z.string().min(2).optional(),
        companyName: z.string().optional().nullable(),
        document: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        addressZip: z.string().optional().nullable(),
        addressStreet: z.string().optional().nullable(),
        addressNumber: z.string().optional().nullable(),
        addressNeighborhood: z.string().optional().nullable(),
        addressCity: z.string().optional().nullable(),
        addressState: z.string().optional().nullable(),
        addressComplement: z.string().optional().nullable(),
        // Novos
        personType: z.enum(['fisica', 'juridica']).optional().nullable(),
        ie: z.string().optional().nullable(),
        im: z.string().optional().nullable(),
        cnae: z.string().optional().nullable(),
        taxRegime: z.string().optional().nullable(),
        mobile: z.string().optional().nullable(),
        emailBilling: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
      })
      .safeParse(req.body);

    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const user = await findUserById(r.auth.userId);
    if (!user) return sendError(res, 401, "Sessão inválida.");

    const nextFullName = body.data.fullName?.trim() ?? user.full_name;
    const nextCompany = typeof body.data.companyName === "string" ? body.data.companyName.trim() || null : user.company_name;
    
    await updateUserProfile({ 
      id: user.id, 
      fullName: nextFullName, 
      companyName: nextCompany,
      document: body.data.document,
      phone: body.data.phone,
      addressZip: body.data.addressZip,
      addressStreet: body.data.addressStreet,
      addressNumber: body.data.addressNumber,
      addressNeighborhood: body.data.addressNeighborhood,
      addressCity: body.data.addressCity,
      addressState: body.data.addressState,
      addressComplement: body.data.addressComplement,
      personType: body.data.personType,
      ie: body.data.ie,
      im: body.data.im,
      cnae: body.data.cnae,
      taxRegime: body.data.taxRegime,
      mobile: body.data.mobile,
      emailBilling: body.data.emailBilling,
      website: body.data.website,
    });

    res.json({ 
      profile: { 
        fullName: nextFullName, 
        companyName: nextCompany,
        document: body.data.document ?? user.document,
        phone: body.data.phone ?? user.phone,
        addressZip: body.data.addressZip ?? user.address_zip,
        addressStreet: body.data.addressStreet ?? user.address_street,
        addressNumber: body.data.addressNumber ?? user.address_number,
        addressNeighborhood: body.data.addressNeighborhood ?? user.address_neighborhood,
        addressCity: body.data.addressCity ?? user.address_city,
        addressState: body.data.addressState ?? user.address_state,
        addressComplement: body.data.addressComplement ?? user.address_complement,
        personType: body.data.personType ?? user.person_type,
        ie: body.data.ie ?? user.ie,
        im: body.data.im ?? user.im,
        cnae: body.data.cnae ?? user.cnae,
        taxRegime: body.data.taxRegime ?? user.tax_regime,
        mobile: body.data.mobile ?? user.mobile,
        emailBilling: body.data.emailBilling ?? user.email_billing,
        website: body.data.website ?? user.website,
      } 
    });
  })
);

meRouter.get(
  "/subscription",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const subscription = await getSubscriptionByUserId(r.auth.userId);
    if (!subscription) return res.json({ subscription: null });

    const plan = await findPlanById(subscription.plan_id);
    if (!plan) return res.json({ subscription: null });

    let features: string[] = [];
    let entitlements: string[] = [];
    try {
      const parsed = JSON.parse(plan.features_json);
      if (Array.isArray(parsed)) {
        const all = parsed.filter((x) => typeof x === "string") as string[];
        entitlements = all.filter((x) => isEntitlementKey(x)).map((x) => x.trim().toLowerCase());
        features = all.filter((x) => !isEntitlementKey(x));
      }
    } catch {
      features = [];
      entitlements = [];
    }

    const now = Date.now();
    const trialEndsAt =
      subscription.status === "active" && subscription.ended_at && subscription.ended_at.getTime() > now
        ? subscription.ended_at
        : null;

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        startedAt: subscription.started_at.toISOString(),
        endedAt: subscription.ended_at ? subscription.ended_at.toISOString() : null,
        trial: {
          active: Boolean(trialEndsAt),
          endsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          priceCents: plan.price_cents,
          billingInterval: "month" as const,
          features,
          entitlements,
          isFeatured: Boolean(plan.is_featured),
          trialEnabled: Boolean(plan.trial_enabled),
          trialDays: Number(plan.trial_days),
        },
      },
    });
  })
);

meRouter.get(
  "/nfe/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const user = await findUserById(r.auth.userId);
    if (!user) return sendError(res, 401, "Sessão inválida.");

    const prefs = typeof user.preferences === "object" && user.preferences ? user.preferences : {};
    const fiscal = (prefs as any).fiscal;
    const environment = fiscal?.environment === "prod" ? "prod" : "homolog";
    const serviceConfigured = Boolean(env.SISFEC_NFE_API_URL && env.SISFEC_NFE_API_KEY);

    res.json({
      enabled: serviceConfigured,
      environment,
    });
  })
);
