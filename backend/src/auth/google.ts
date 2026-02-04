import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../env.js";

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function assertGoogleConfigured() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth não configurado (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI).");
  }
}

export function buildGoogleAuthUrl(args: { state: string }) {
  assertGoogleConfigured();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", args.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCodeForTokens(args: { code: string }) {
  assertGoogleConfigured();
  const body = new URLSearchParams();
  body.set("code", args.code);
  body.set("client_id", env.GOOGLE_CLIENT_ID!);
  body.set("client_secret", env.GOOGLE_CLIENT_SECRET!);
  body.set("redirect_uri", env.GOOGLE_REDIRECT_URI!);
  body.set("grant_type", "authorization_code");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao trocar code por token (Google): ${res.status} ${text}`);

  let data: unknown = null;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    data = null;
  }

  if (!data || typeof data !== "object") throw new Error("Resposta inválida do Google OAuth.");
  const idToken = (data as { id_token?: unknown }).id_token;
  if (typeof idToken !== "string" || idToken.length < 10) throw new Error("Google OAuth não retornou id_token.");
  return { idToken };
}

export async function verifyGoogleIdToken(idToken: string) {
  assertGoogleConfigured();
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID!,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  const name = typeof payload.name === "string" ? payload.name : null;
  const emailVerified = typeof payload.email_verified === "boolean" ? payload.email_verified : null;

  if (!sub || !email) throw new Error("Token do Google inválido (sub/email ausentes).");
  if (emailVerified === false) throw new Error("Email do Google não verificado.");

  return { sub, email, name };
}

