import { Router } from "express";
import { z } from "zod";
import { asyncHandler, sendError } from "../http.js";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { env } from "../env.js";
import { findPlanById } from "../repos/plans.js";
import { createMpOrder } from "../integrations/mercadopago/orders.js";
import { createMpPayment, getMpPayment } from "../integrations/mercadopago/payments.js";
import { cancelActiveSubscriptionsForUser, cancelSubscriptionById, createManualSubscription, getSubscriptionByUserId, upsertSubscriptionByMpPreapprovalId } from "../repos/subscriptions.js";
import { findUserById, updateUserTrial } from "../repos/users.js";

export const billingRouter = Router();

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type MpPreapprovalResponse = {
  init_point?: string;
  id?: string;
};

async function fetchMpPreapproval(id: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");
  const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Falha ao consultar Mercado Pago: ${r.status}`);
  return (await r.json()) as any;
}

async function cancelMpPreapproval(id: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");
  const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Falha ao cancelar no Mercado Pago: ${r.status}`);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mapMpStatusToInternal(status: string | null | undefined): "active" | "canceled" | "past_due" {
  const s = (status ?? "").toLowerCase();
  if (s === "authorized") return "active";
  if (s === "cancelled" || s === "canceled") return "canceled";
  return "past_due";
}

billingRouter.post(
  "/checkout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body = z.object({ planId: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const plan = await findPlanById(body.data.planId);
    if (!plan || !plan.is_active) return sendError(res, 404, "Plano não encontrado.");
    if (Number(plan.price_cents) <= 0) return sendError(res, 400, "Preço do plano inválido.");

    const existing = await getSubscriptionByUserId(r.auth.userId);
    if (existing?.status === "active" && existing.plan_id === plan.id) {
      return sendError(res, 409, "Você já está neste plano.");
    }

    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);

    const payload: any = {
      reason: `SISFEC - ${plan.name}`,
      external_reference: `user:${r.auth.userId}:plan:${plan.id}`,
      payer_email: r.auth.email,
      notification_url: env.WEBHOOK_BASE_URL ? `${env.WEBHOOK_BASE_URL}/api/webhooks/mercadopago` : undefined,
      back_url: `${env.APP_ORIGIN}/app#plan`,
      status: "pending",
    };
    if (plan.mp_preapproval_plan_id) {
      payload.preapproval_plan_id = plan.mp_preapproval_plan_id;
    } else {
      payload.auto_recurring = {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cents / 100,
        currency_id: "BRL",
        start_date: now.toISOString(),
        end_date: end.toISOString(),
      };
    }

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await mpRes.text();
    if (!mpRes.ok) {
      let mpBody: any = null;
      try {
        mpBody = text ? JSON.parse(text) : null;
      } catch {
        mpBody = null;
      }
      const mpMessage =
        typeof mpBody === "object" && mpBody && typeof mpBody.message === "string"
          ? mpBody.message
          : typeof mpBody === "object" && mpBody && typeof mpBody.error === "string"
            ? mpBody.error
            : null;

      const message = mpMessage ? `Mercado Pago: ${mpMessage}` : "Falha ao criar assinatura no Mercado Pago.";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[MP] preapproval error", { status: mpRes.status, mpMessage, mpBody: mpBody ?? text });
      }
      return sendError(res, 502, message, { status: mpRes.status, mp: mpBody ?? text });
    }

    let data: MpPreapprovalResponse | null = null;
    try {
      data = JSON.parse(text) as MpPreapprovalResponse;
    } catch {
      data = null;
    }

    const initPoint = data?.init_point;
    if (!initPoint) return sendError(res, 502, "Resposta inválida do Mercado Pago.");

    const mpPreapprovalId = data?.id;
    if (mpPreapprovalId) {
      await upsertSubscriptionByMpPreapprovalId({
        userId: r.auth.userId,
        planId: plan.id,
        status: "past_due",
        mpPreapprovalId,
      });
    }

    res.json({ initPoint, mpPreapprovalId: mpPreapprovalId ?? null });
  })
);

billingRouter.post(
  "/checkout-transparent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body = z
      .object({
        planId: z.string().min(1),
        token: z.string().min(1),
        paymentMethodId: z.string().min(1).optional(),
        issuerId: z.string().min(1).optional(),
        installments: z.coerce.number().int().min(1).optional(),
        identificationType: z.string().min(1).optional(),
        identificationNumber: z.string().min(1).optional(),
        payerEmail: z.string().email().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const plan = await findPlanById(body.data.planId);
    if (!plan || !plan.is_active) return sendError(res, 404, "Plano não encontrado.");
    if (Number(plan.price_cents) <= 0) return sendError(res, 400, "Preço do plano inválido.");
    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    const user = await findUserById(r.auth.userId);
    if (!user) return sendError(res, 401, "Sessão inválida.");

    const existing = await getSubscriptionByUserId(r.auth.userId);
    if (existing?.status === "active" && existing.plan_id === plan.id) {
      return sendError(res, 409, "Você já está neste plano.");
    }

    const payload: any = {
      reason: `SISFEC - ${plan.name}`,
      external_reference: `user:${r.auth.userId}:plan:${plan.id}`,
      payer_email: body.data.payerEmail ?? user.email,
      back_url: `${env.APP_ORIGIN}/app#plan`,
      status: "authorized",
      card_token_id: body.data.token,
    };
    if (plan.mp_preapproval_plan_id) {
      payload.preapproval_plan_id = plan.mp_preapproval_plan_id;
    } else {
      payload.auto_recurring = {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.price_cents) / 100,
        currency_id: "BRL",
      };
    }

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await mpRes.text();
    if (!mpRes.ok) {
      let mpBody: any = null;
      try {
        mpBody = text ? JSON.parse(text) : null;
      } catch {
        mpBody = null;
      }
      const mpMessage =
        typeof mpBody === "object" && mpBody && typeof mpBody.message === "string"
          ? mpBody.message
          : typeof mpBody === "object" && mpBody && typeof mpBody.error === "string"
            ? mpBody.error
            : null;

      const message = mpMessage ? `Mercado Pago: ${mpMessage}` : "Falha ao criar assinatura no Mercado Pago.";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[MP] preapproval error", { status: mpRes.status, mpMessage, mpBody: mpBody ?? text });
      }
      return sendError(res, 502, message, { status: mpRes.status, mp: mpBody ?? text });
    }

    let data: MpPreapprovalResponse | null = null;
    try {
      data = JSON.parse(text) as MpPreapprovalResponse;
    } catch {
      data = null;
    }

    const mpPreapprovalId = data?.id ?? null;
    const status = mapMpStatusToInternal((data as any)?.status);
    const startedAt = status === "active" ? new Date() : undefined;
    if (status === "active") {
      await cancelActiveSubscriptionsForUser(r.auth.userId, new Date());
    }

    if (mpPreapprovalId) {
      await upsertSubscriptionByMpPreapprovalId({
        userId: r.auth.userId,
        planId: plan.id,
        status,
        mpPreapprovalId,
        startedAt,
      });
    }

    res.json({ ok: true, mpPreapprovalId });
  })
);

billingRouter.post(
  "/subscription/sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;

    const sub = await getSubscriptionByUserId(r.auth.userId);
    if (!sub) return sendError(res, 404, "Assinatura não encontrada.");
    if (!sub.mp_preapproval_id) {
      return res.json({ ok: true, status: sub.status });
    }
    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    const mp = await fetchMpPreapproval(sub.mp_preapproval_id);
    const status = mapMpStatusToInternal(mp?.status);
    const startedAt = status === "active" ? new Date() : undefined;
    const endedAt = status === "canceled" ? new Date() : null;

    await upsertSubscriptionByMpPreapprovalId({
      userId: sub.user_id,
      planId: sub.plan_id,
      status,
      mpPreapprovalId: sub.mp_preapproval_id,
      startedAt,
      endedAt,
    });

    res.json({ ok: true, status });
  })
);

billingRouter.post(
  "/subscription/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;

    const sub = await getSubscriptionByUserId(r.auth.userId);
    if (!sub) return sendError(res, 404, "Assinatura não encontrada.");
    if (!sub.mp_preapproval_id) {
      await cancelSubscriptionById(sub.id, new Date());
      return res.json({ ok: true });
    }
    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    await cancelMpPreapproval(sub.mp_preapproval_id);

    await upsertSubscriptionByMpPreapprovalId({
      userId: sub.user_id,
      planId: sub.plan_id,
      status: "canceled",
      mpPreapprovalId: sub.mp_preapproval_id,
      endedAt: new Date(),
    });

    res.json({ ok: true });
  })
);

billingRouter.post(
  "/activate-free",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body = z.object({ planId: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const plan = await findPlanById(body.data.planId);
    if (!plan || !plan.is_active) return sendError(res, 404, "Plano não encontrado.");
    if (Number(plan.price_cents) > 0) return sendError(res, 400, "Este plano não é gratuito.");

    const existing = await getSubscriptionByUserId(r.auth.userId);
    if (existing?.mp_preapproval_id && existing.status !== "canceled") {
      if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");
      await cancelMpPreapproval(existing.mp_preapproval_id);
    }

    const now = new Date();
    const trialEndsAt = plan.trial_enabled ? addDays(now, Math.max(1, Number(plan.trial_days) || 7)) : null;

    await cancelActiveSubscriptionsForUser(r.auth.userId, now);
    await createManualSubscription({
      userId: r.auth.userId,
      planId: plan.id,
      status: "active",
      startedAt: now,
      endedAt: trialEndsAt,
    });
    await updateUserTrial(r.auth.userId, trialEndsAt ? now : null, trialEndsAt);

    res.json({ ok: true });
  })
);

billingRouter.post(
  "/orders",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body = z.object({ planId: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const plan = await findPlanById(body.data.planId);
    if (!plan || !plan.is_active) return sendError(res, 404, "Plano não encontrado.");
    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    const externalReference = `user:${r.auth.userId}:plan:${plan.id}:order`;
    const notificationUrl = env.WEBHOOK_BASE_URL ? `${env.WEBHOOK_BASE_URL}/api/webhooks/mercadopago/orders` : undefined;

    const out = await createMpOrder({
      external_reference: externalReference,
      items: [{ title: `SISFEC - ${plan.name}`, quantity: 1, unit_price: plan.price_cents / 100, currency_id: "BRL" }],
      notification_url: notificationUrl,
    });

    res.json(out);
  })
);

billingRouter.post(
  "/payments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    const body = z
      .object({
        transaction_amount: z.coerce.number().positive(),
        payment_method_id: z.string().min(1),
        payer: z.object({
          email: z.string().email(),
          identification: z.object({ type: z.string().min(1), number: z.string().min(1) }).optional(),
        }),
        token: z.string().min(1).optional(),
        installments: z.coerce.number().int().min(1).optional(),
        issuer_id: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
      })
      .safeParse(req.body);

    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const notificationUrl = env.WEBHOOK_BASE_URL ? `${env.WEBHOOK_BASE_URL}/api/webhooks/mercadopago/payments` : undefined;

    const payment = await createMpPayment({
      ...body.data,
      external_reference: `user:${r.auth.userId}`,
      notification_url: notificationUrl,
    });

    res.json({ payment });
  })
);

billingRouter.get(
  "/payments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return sendError(res, 400, "Dados inválidos.", params.error.flatten());
    const payment = await getMpPayment(params.data.id);
    res.json({ payment });
  })
);
