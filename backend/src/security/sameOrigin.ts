import type { RequestHandler } from "express";
import { sendError } from "../http.js";
import { recordSecurityEvent } from "./events.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function sameOriginGuard(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins.map((o) => o.trim()).filter(Boolean));
  const isProd = process.env.NODE_ENV === "production";

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const rawOrigin = req.headers.origin;
    const origin = typeof rawOrigin === "string" ? normalizeOrigin(rawOrigin) : null;

    if (isProd && (!origin || origin === "null")) {
      const rawReferer = req.headers.referer;
      const refererOrigin = typeof rawReferer === "string" ? normalizeOrigin(rawReferer) : null;
      if (!refererOrigin) {
        void recordSecurityEvent(req, "origin_missing");
        return sendError(res, 403, "Requisição bloqueada.");
      }
    }

    if (origin && !allowed.has(origin)) {
      void recordSecurityEvent(req, "origin_block");
      return sendError(res, 403, "Requisição bloqueada.");
    }

    const rawReferer = req.headers.referer;
    const refererOrigin = typeof rawReferer === "string" ? normalizeOrigin(rawReferer) : null;
    if (!origin && refererOrigin && !allowed.has(refererOrigin)) {
      void recordSecurityEvent(req, "referer_block");
      return sendError(res, 403, "Requisição bloqueada.");
    }

    return next();
  };
}
