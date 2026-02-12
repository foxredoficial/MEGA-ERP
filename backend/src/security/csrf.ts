import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { sendError } from "../http.js";
import { recordSecurityEvent } from "./events.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function csrfGuard(): RequestHandler {
  const isProd = process.env.NODE_ENV === "production";

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (!isProd) return next();

    const cookieToken = typeof req.cookies?.[CSRF_COOKIE_NAME] === "string" ? req.cookies[CSRF_COOKIE_NAME] : null;
    const headerToken = typeof req.headers[CSRF_HEADER_NAME] === "string" ? req.headers[CSRF_HEADER_NAME] : null;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      void recordSecurityEvent(req, "csrf_block");
      return sendError(res, 403, "Requisição bloqueada.");
    }

    return next();
  };
}

export function setCsrfCookie(res: any) {
  const isProd = process.env.NODE_ENV === "production";
  const token = randomUUID();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function clearCsrfCookie(res: any) {
  res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
}
