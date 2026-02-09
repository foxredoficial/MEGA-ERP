import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export async function createPasswordResetToken(args: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const id = randomUUID();
  const now = new Date();
  await pool.query(
    "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, ip, user_agent, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [id, args.userId, args.tokenHash, args.expiresAt, null, args.ip ?? null, args.userAgent ?? null, now]
  );
  return { id };
}

export async function consumePasswordResetToken(args: { tokenHash: string }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? FOR UPDATE",
      [args.tokenHash]
    );

    const row = rows[0] as any | undefined;
    if (!row) {
      await conn.rollback();
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(row.expires_at);
    if (row.used_at || expiresAt.getTime() <= now.getTime()) {
      await conn.rollback();
      return null;
    }

    await conn.query("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?", [now, row.id]);
    await conn.commit();
    return { userId: String(row.user_id) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

