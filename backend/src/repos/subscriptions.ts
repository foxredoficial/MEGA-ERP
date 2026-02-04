import { pool } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "canceled" | "past_due";
  mp_preapproval_id: string | null;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRow | null> {
  const [rows] = await pool.query<(SubscriptionRow & RowDataPacket)[]>(
    "SELECT id, user_id, plan_id, status, mp_preapproval_id, started_at, ended_at, created_at, updated_at FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  return rows[0] ?? null;
}
