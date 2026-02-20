import type { NextFunction, Request, Response } from "express";
import { getSessionFromRequest } from "./session.js";
import { sendError } from "../http.js";
import { pool } from "../db.js";

export type AuthedRequest = Request & {
  auth: { userId: string; email: string; role: 'user' | 'admin' };
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getSessionFromRequest(req);
  if (!session) return sendError(res, 401, "Não autenticado.");
  try {
    const [rows] = await pool.query<any[]>("SELECT role FROM users WHERE id = ?", [session.userId]);
    const dbRole = rows[0]?.role;
    const role = dbRole === "admin" ? "admin" : "user";
    (req as AuthedRequest).auth = { ...session, role };
    next();
  } catch (err) {
    const role = (session as any).role === "admin" ? "admin" : "user";
    (req as AuthedRequest).auth = { ...session, role };
    next();
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = await getSessionFromRequest(req);
  if (!session) return sendError(res, 401, "Não autenticado.");
  
  try {
    // Check role in DB to be sure (handle manual updates or token staleness)
    const [rows] = await pool.query<any[]>("SELECT role FROM users WHERE id = ?", [session.userId]);
    const dbRole = rows[0]?.role;

    if (dbRole !== 'admin') {
       return sendError(res, 403, "Acesso negado. Requer privilégios de administrador.");
    }
    
    (req as AuthedRequest).auth = { ...session, role: 'admin' };
    next();
  } catch (err) {
    console.error("Error verifying admin role:", err);
    return sendError(res, 500, "Erro interno ao verificar permissões.");
  }
}
