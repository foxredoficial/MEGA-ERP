import { pool } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";

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

export async function upsertSubscriptionByMpPreapprovalId(args: {
  userId: string;
  planId: string;
  status: SubscriptionRow["status"];
  mpPreapprovalId: string;
  startedAt?: Date;
  endedAt?: Date | null;
}) {
  const now = new Date();
  const [existing] = await pool.query<(SubscriptionRow & RowDataPacket)[]>(
    "SELECT id FROM subscriptions WHERE mp_preapproval_id = ? LIMIT 1",
    [args.mpPreapprovalId]
  );

  if (existing[0]) {
    await pool.query(
      "UPDATE subscriptions SET user_id = ?, plan_id = ?, status = ?, started_at = COALESCE(?, started_at), ended_at = ?, updated_at = ? WHERE id = ?",
      [args.userId, args.planId, args.status, args.startedAt ?? null, args.endedAt ?? null, now, existing[0].id]
    );
    return;
  }

  const id = randomUUID();
  await pool.query(
    "INSERT INTO subscriptions (id, user_id, plan_id, status, mp_preapproval_id, started_at, ended_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [id, args.userId, args.planId, args.status, args.mpPreapprovalId, args.startedAt ?? now, args.endedAt ?? null, now, now]
  );
}

export async function createManualSubscription(args: {
  userId: string;
  planId: string;
  status: SubscriptionRow["status"];
  startedAt?: Date;
  endedAt?: Date | null;
}) {
  const now = new Date();
  const id = randomUUID();
  await pool.query(
    "INSERT INTO subscriptions (id, user_id, plan_id, status, mp_preapproval_id, started_at, ended_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [id, args.userId, args.planId, args.status, null, args.startedAt ?? now, args.endedAt ?? null, now, now]
  );
  return id;
}

export async function cancelActiveSubscriptionsForUser(userId: string, endedAt: Date = new Date()) {
  const now = new Date();
  await pool.query(
    "UPDATE subscriptions SET status = 'canceled', ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE user_id = ? AND status = 'active'",
    [endedAt, now, userId]
  );
}
