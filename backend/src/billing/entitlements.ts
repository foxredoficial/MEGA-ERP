import { pool } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";
import type { SubscriptionRow } from "../repos/subscriptions.js";
import { getSubscriptionByUserId } from "../repos/subscriptions.js";
import type { PlanRow } from "../repos/plans.js";

export type PlanEntitlements = {
  plan: PlanRow;
  features: string[];
};

function parseFeaturesJson(featuresJson: any): string[] {
  if (Array.isArray(featuresJson)) return featuresJson.filter((x) => typeof x === "string");
  if (typeof featuresJson === "string") {
    try {
      const parsed = JSON.parse(featuresJson);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    } catch {
      return [];
    }
  }
  return [];
}

export function hasFeature(ent: PlanEntitlements | null, feature: string) {
  if (!ent) return false;
  return ent.features.includes(feature);
}

export async function getLatestSubscription(userId: string): Promise<SubscriptionRow | null> {
  return getSubscriptionByUserId(userId);
}

export async function getPlanEntitlements(userId: string): Promise<{ subscription: SubscriptionRow | null; entitlements: PlanEntitlements | null }> {
  const sub = await getLatestSubscription(userId);
  if (!sub) return { subscription: null, entitlements: null };

  const [plans] = await pool.query<(PlanRow & RowDataPacket)[]>(
    "SELECT id, name, description, price_cents, features_json, max_users, max_products, max_invoices, trial_enabled, trial_days, is_featured, is_active, created_at, updated_at FROM plans WHERE id = ? LIMIT 1",
    [sub.plan_id]
  );
  const plan = plans[0] ?? null;
  if (!plan) return { subscription: sub, entitlements: null };

  const features = parseFeaturesJson((plan as any).features_json);
  return { subscription: sub, entitlements: { plan, features } };
}

export async function countUserProducts(userId: string) {
  const [rows] = await pool.query<any[]>("SELECT COUNT(*) as n FROM products WHERE user_id = ?", [userId]);
  return Number(rows?.[0]?.n ?? 0);
}
