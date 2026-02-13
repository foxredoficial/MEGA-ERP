import type { Subscription } from "@/lib/api";

export type FeatureKey =
  | "products"
  | "contacts"
  | "services"
  | "salespersons"
  | "categories"
  | "price_lists"
  | "sales_orders"
  | "docs"
  | "pdv"
  | "service_orders"
  | "stock"
  | "finance"
  | "banks"
  | "cash"
  | "reports"
  | "analytics"
  | "notifications"
  | "apps"
  | "help";

export function subscriptionHasFeature(subscription: Subscription | null, feature: FeatureKey) {
  if (!subscription) return true;
  if (subscription.status !== "active") return false;

  const raw = subscription.plan.entitlements ?? subscription.plan.features ?? [];
  const set = new Set(raw.map((x) => String(x).trim().toLowerCase()));
  return set.has(feature) || set.has(`app:${feature}`) || set.has(`feature:${feature}`);
}
