import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { env } from "../env.js";
import { clearCsrfCookie, setCsrfCookie } from "../security/csrf.js";

type SessionPayload = {
  sub: string;
  email: string;
  role?: 'user' | 'admin';
};

const encoder = new TextEncoder();
const secretKey = encoder.encode(env.SESSION_JWT_SECRET);

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secretKey);
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  const role = typeof payload.role === "string" && (payload.role === 'user' || payload.role === 'admin') ? payload.role : 'user';
  if (!sub || !email) return null;
  return { userId: sub, email, role };
}

export function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    // Em desenvolvimento (localhost/127.0.0.1), não setar domínio permite compartilhamento entre portas no mesmo hostname
    // Se setar domain: 'localhost', só funciona em localhost. Se não setar, funciona no host atual.
  });

  setCsrfCookie(res);
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
  clearCsrfCookie(res);
}

export async function getSessionFromRequest(req: Request) {
  const raw = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (!raw) {
    // console.log("[Session] No session cookie found in request"); // Verbose
    return null;
  }
  if (typeof raw !== "string" || raw.length < 10) return null;
  try {
    return await verifySession(raw);
  } catch {
    return null;
  }
}
