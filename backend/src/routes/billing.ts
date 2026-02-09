import { Router } from "express";
import { z } from "zod";
import { asyncHandler, sendError } from "../http.js";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { env } from "../env.js";
import { findPlanById } from "../repos/plans.js";

export const billingRouter = Router();

type MpPreapprovalResponse = {
  init_point?: string;
  id?: string;
};

billingRouter.post(
  "/checkout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const body = z.object({ planId: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const plan = await findPlanById(body.data.planId);
    if (!plan || !plan.is_active) return sendError(res, 404, "Plano não encontrado.");

    if (!env.MP_ACCESS_TOKEN) return sendError(res, 500, "Mercado Pago não configurado.");

    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);

    const payload = {
      reason: `MEGA ERP - ${plan.name}`,
      external_reference: `user:${r.auth.userId}:plan:${plan.id}`,
      payer_email: r.auth.email,
      notification_url: env.WEBHOOK_BASE_URL ? `${env.WEBHOOK_BASE_URL}/api/webhooks/mercadopago` : undefined,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cents / 100,
        currency_id: "BRL",
        start_date: now.toISOString(),
        end_date: end.toISOString(),
      },
      back_url: `${env.APP_ORIGIN}/app#plan`,
      status: "pending",
    };

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await mpRes.text();
    if (!mpRes.ok) return sendError(res, 502, "Falha ao criar assinatura no Mercado Pago.", { status: mpRes.status, body: text });

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
      const { upsertSubscriptionByMpPreapprovalId } = await import("../repos/subscriptions.js");
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
