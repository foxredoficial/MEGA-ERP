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

  const entitlements = subscription.plan.entitlements ?? [];
  const features = subscription.plan.features ?? [];
  const raw = entitlements.length > 0 ? entitlements : features;
  if (raw.length === 0) return true;
  const set = new Set(raw.map((x) => String(x).trim().toLowerCase()));
  return set.has(feature) || set.has(`app:${feature}`) || set.has(`feature:${feature}`);
}
