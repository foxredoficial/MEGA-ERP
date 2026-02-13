export const FEATURE_KEYS = [
  "products",
  "contacts",
  "services",
  "salespersons",
  "categories",
  "price_lists",
  "sales_orders",
  "docs",
  "pdv",
  "service_orders",
  "stock",
  "finance",
  "banks",
  "cash",
  "reports",
  "analytics",
  "notifications",
  "apps",
  "help",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isEntitlementKey(raw: string) {
  const s = raw.trim().toLowerCase();
  if (FEATURE_KEYS.includes(s as any)) return true;
  if (s.startsWith("app:") || s.startsWith("feature:")) {
    const key = s.split(":").slice(1).join(":");
    return FEATURE_KEYS.includes(key as any);
  }
  return false;
}

