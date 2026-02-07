import { Router } from "express";
import { asyncHandler, sendError } from "../http.js";
import { recordSecurityEvent } from "./events.js";

const DEFAULT_TARGETS = [
  "/api/.env",
  "/api/env",
  "/api/config",
  "/api/phpmyadmin",
  "/api/pma",
  "/api/wp-login.php",
  "/api/wp-admin",
  "/api/wp-json",
  "/api/admin.php",
  "/api/actuator",
  "/api/actuator/health",
  "/api/metrics",
  "/api/debug",
  "/api/console",
];

export function honeypotRouter() {
  const router = Router();

  for (const path of DEFAULT_TARGETS) {
    router.all(
      path,
      asyncHandler(async (req, res) => {
        await recordSecurityEvent(req, "honeypot_hit");
        return sendError(res, 404, "Rota não encontrada.");
      })
    );
  }

  return router;
}

