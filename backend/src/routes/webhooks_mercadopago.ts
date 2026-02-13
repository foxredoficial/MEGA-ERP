import { Router } from "express";
import { randomUUID, createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";
import { pool } from "../db.js";
import { upsertSubscriptionByMpPreapprovalId } from "../repos/subscriptions.js";
import { recordSecurityEvent } from "../security/events.js";

const router = Router();

async function fetchPreapproval(id: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN não configurado");
  const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Falha ao consultar MercadoPago: ${r.status}`);
  return (await r.json()) as any;
}

function parseExternalReference(ref: string | null | undefined) {
  if (!ref) return null;
  const m = ref.match(/user:([a-f0-9\-]{36}):plan:([a-f0-9\-]{36})/i);
  if (!m) return null;
  const userId = m[1].toLowerCase();
  const planId = m[2].toLowerCase();
  if (!/^[a-f0-9\-]{36}$/.test(userId) || !/^[a-f0-9\-]{36}$/.test(planId)) return null;
  return { userId, planId };
}

function mapMpStatusToInternal(status: string | null | undefined): "active" | "canceled" | "past_due" {
  const s = (status ?? "").toLowerCase();
  if (s === "authorized") return "active";
  if (s === "cancelled" || s === "canceled") return "canceled";
  return "past_due";
}

router.post("/mercadopago", async (req, res) => {
  try {
    if (env.MP_WEBHOOK_SIGNATURE_SECRET) {
      const signature = typeof req.headers["x-signature"] === "string" ? (req.headers["x-signature"] as string) : null;
      const requestId = typeof req.headers["x-request-id"] === "string" ? (req.headers["x-request-id"] as string) : null;
      const dataId = (req.body as any)?.data?.id ?? (req.body as any)?.id;
      if (!verifyMpSignature(signature, requestId, typeof dataId === "string" ? dataId : null, env.MP_WEBHOOK_SIGNATURE_SECRET)) {
        void recordSecurityEvent(req, "mp_webhook_signature_invalid");
        return res.status(401).json({ ok: false });
      }
    }

    const eventKey =
      (req.headers["x-request-id"] as string | undefined) ??
      createHash("sha256").update(JSON.stringify(req.body ?? {})).digest("hex");

    const id = randomUUID();
    const now = new Date();
    try {
      await pool.query("INSERT INTO mp_webhook_events (id, mp_event_key, payload_json, created_at) VALUES (?,?,?,?)", [
        id,
        eventKey,
        JSON.stringify(req.body ?? {}),
        now,
      ]);
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") {
        return res.json({ ok: true, deduped: true });
      }
      throw e;
    }

    const dataId = (req.body as any)?.data?.id ?? (req.body as any)?.id;
    if (!dataId || typeof dataId !== "string") return res.json({ ok: true });

    const preapproval = await fetchPreapproval(dataId);
    const mpId = String(preapproval.id ?? dataId);
    const ref = parseExternalReference(preapproval.external_reference);
    if (!ref) return res.json({ ok: true });

    const status = mapMpStatusToInternal(preapproval.status);
    const startedAt = status === "active" ? new Date() : undefined;
    const endedAt = status === "canceled" ? new Date() : null;

    await upsertSubscriptionByMpPreapprovalId({
      userId: ref.userId,
      planId: ref.planId,
      status,
      mpPreapprovalId: mpId,
      startedAt,
      endedAt,
    });

    res.json({ ok: true });
  } catch (e) {
    void recordSecurityEvent(req, "mp_webhook_error");
    res.json({ ok: true });
  }
});

async function recordMpEvent(req: any, eventKey: string) {
  const id = randomUUID();
  const now = new Date();
  await pool.query("INSERT INTO mp_webhook_events (id, mp_event_key, payload_json, created_at) VALUES (?,?,?,?)", [
    id,
    eventKey,
    JSON.stringify(req.body ?? {}),
    now,
  ]);
}

async function fetchMpResource(resourceUrl: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN não configurado");
  const r = await fetch(resourceUrl, { method: "GET", headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  const raw = await r.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!r.ok) throw new Error(`Falha ao consultar MercadoPago: ${r.status}`);
  return data;
}

router.post("/mercadopago/orders", async (req, res) => {
  try {
    if (env.MP_WEBHOOK_SIGNATURE_SECRET) {
      const signature = typeof req.headers["x-signature"] === "string" ? (req.headers["x-signature"] as string) : null;
      const requestId = typeof req.headers["x-request-id"] === "string" ? (req.headers["x-request-id"] as string) : null;
      const dataId = (req.body as any)?.data?.id ?? (req.body as any)?.id;
      if (!verifyMpSignature(signature, requestId, typeof dataId === "string" ? dataId : null, env.MP_WEBHOOK_SIGNATURE_SECRET)) {
        void recordSecurityEvent(req, "mp_webhook_signature_invalid");
        return res.status(401).json({ ok: false });
      }
    }

    const eventKey =
      (req.headers["x-request-id"] as string | undefined) ??
      createHash("sha256").update(JSON.stringify(req.body ?? {})).digest("hex");

    try {
      await recordMpEvent(req, eventKey);
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") return res.json({ ok: true, deduped: true });
      throw e;
    }

    const resource = (req.body as any)?.resource;
    if (resource && typeof resource === "string") {
      try {
        await fetchMpResource(resource);
      } catch {
        void 0;
      }
    }

    res.json({ ok: true });
  } catch {
    void recordSecurityEvent(req, "mp_webhook_error");
    res.json({ ok: true });
  }
});

router.post("/mercadopago/payments", async (req, res) => {
  try {
    if (env.MP_WEBHOOK_SIGNATURE_SECRET) {
      const signature = typeof req.headers["x-signature"] === "string" ? (req.headers["x-signature"] as string) : null;
      const requestId = typeof req.headers["x-request-id"] === "string" ? (req.headers["x-request-id"] as string) : null;
      const dataId = (req.body as any)?.data?.id ?? (req.body as any)?.id;
      if (!verifyMpSignature(signature, requestId, typeof dataId === "string" ? dataId : null, env.MP_WEBHOOK_SIGNATURE_SECRET)) {
        void recordSecurityEvent(req, "mp_webhook_signature_invalid");
        return res.status(401).json({ ok: false });
      }
    }

    const eventKey =
      (req.headers["x-request-id"] as string | undefined) ??
      createHash("sha256").update(JSON.stringify(req.body ?? {})).digest("hex");

    try {
      await recordMpEvent(req, eventKey);
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") return res.json({ ok: true, deduped: true });
      throw e;
    }

    const resource = (req.body as any)?.resource;
    if (resource && typeof resource === "string") {
      try {
        await fetchMpResource(resource);
      } catch {
        void 0;
      }
    }

    res.json({ ok: true });
  } catch {
    void recordSecurityEvent(req, "mp_webhook_error");
    res.json({ ok: true });
  }
});

function verifyMpSignature(
  signature: string | null,
  requestId: string | null,
  dataId: string | null,
  secret: string
) {
  if (!signature || !requestId || !dataId) return false;
  const parts = signature.split(",").map((s) => s.trim());
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3) ?? null;
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3) ?? null;
  if (!ts || !v1) return false;
  const template = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const digest = createHmac("sha256", secret).update(template).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

export default router;
