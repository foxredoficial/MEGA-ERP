import { randomUUID } from "node:crypto";
import { env } from "../../env.js";

export type MpRequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: unknown;
  idempotencyKey?: string;
};

export async function mpRequest<T>(opts: MpRequestOptions): Promise<{ status: number; data: T; raw: string }> {
  if (!env.MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
  const key = opts.idempotencyKey ?? randomUUID();
  headers["X-Idempotency-Key"] = key;

  const r = await fetch(opts.url, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const raw = await r.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { status: r.status, data: data as T, raw };
}

