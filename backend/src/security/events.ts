import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { pool } from "../db.js";

export async function recordSecurityEvent(req: Request, kind: string) {
  try {
    const id = randomUUID();
    const ip = (req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? null) as string | null;
    const method = req.method ?? null;
    const path = req.path ?? null;
    const query = typeof req.url === "string" ? req.url.split("?")[1] ?? "" : "";
    const userAgent = (req.headers["user-agent"] ?? null) as string | null;

    await pool.query(
      "INSERT INTO security_events (id, kind, ip, method, path, query, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, kind, ip, method, path, query, userAgent]
    );
  } catch {
    return;
  }
}
