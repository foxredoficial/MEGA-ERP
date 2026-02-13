import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db.js";

export type AdminAnalyticsGranularity = "day" | "week" | "month";

export type AdminAnalyticsRange = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
};

export type AdminDashboardQuery = {
  range: AdminAnalyticsRange;
  compare?: AdminAnalyticsRange;
  granularity: AdminAnalyticsGranularity;
};

type SeriesRow = { t: string; n: number };

function bucketExpr(col: string, granularity: AdminAnalyticsGranularity) {
  if (granularity === "day") return `DATE_FORMAT(DATE(${col}), '%Y-%m-%d')`;
  if (granularity === "week") return `DATE_FORMAT(DATE_SUB(DATE(${col}), INTERVAL (DAYOFWEEK(${col})-1) DAY), '%Y-%m-%d')`;
  return `DATE_FORMAT(DATE_SUB(DATE(${col}), INTERVAL (DAY(${col})-1) DAY), '%Y-%m-%d')`;
}

function fmt2(n: number) {
  return String(n).padStart(2, "0");
}

function parseIsoDateOnly(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function deltaStartMs(current: AdminAnalyticsRange, compare: AdminAnalyticsRange) {
  const c1 = parseIsoDateOnly(current.start);
  const c2 = parseIsoDateOnly(compare.start);
  if (!c1 || !c2) return 0;
  return c1.getTime() - c2.getTime();
}

function formatBucketDate(d: Date) {
  const y = d.getFullYear();
  const m = fmt2(d.getMonth() + 1);
  const day = fmt2(d.getDate());
  return `${y}-${m}-${day}`;
}

function alignCompareT(t: string, deltaMs: number) {
  const d = parseIsoDateOnly(t);
  if (!d) return t;
  const shifted = new Date(d.getTime() + deltaMs);
  return formatBucketDate(shifted);
}

async function seriesCount(table: "users" | "subscriptions", dateCol: string, r: AdminAnalyticsRange, g: AdminAnalyticsGranularity, extraWhere?: string, extraParams?: any[]) {
  const bucket = bucketExpr(dateCol, g);
  const where = [`${dateCol} BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`];
  const params: any[] = [r.start, r.end];
  if (extraWhere) {
    where.push(extraWhere);
    if (extraParams) params.push(...extraParams);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${bucket} as t, COUNT(*) as n
     FROM ${table}
     WHERE ${where.join(" AND ")}
     GROUP BY t
     ORDER BY t`,
    params
  );

  return rows.map((x) => ({ t: String(x.t), n: Number(x.n ?? 0) })) as SeriesRow[];
}

async function kpis(r: AdminAnalyticsRange) {
  const [[totUsers]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as n FROM users");
  const [[activeSubs]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as n FROM subscriptions WHERE status = 'active'");
  const [[usersInRange]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) as n FROM users WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)",
    [r.start, r.end]
  );
  const [[subsStartedInRange]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) as n FROM subscriptions WHERE started_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)",
    [r.start, r.end]
  );
  const [[subsCanceledInRange]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) as n FROM subscriptions WHERE ended_at IS NOT NULL AND ended_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)",
    [r.start, r.end]
  );

  return {
    totalUsers: Number(totUsers?.n ?? 0),
    activeSubscriptions: Number(activeSubs?.n ?? 0),
    signups: Number(usersInRange?.n ?? 0),
    subscriptionsStarted: Number(subsStartedInRange?.n ?? 0),
    subscriptionsEnded: Number(subsCanceledInRange?.n ?? 0),
  };
}

async function activeSubscriptionsSeries(r: AdminAnalyticsRange, g: AdminAnalyticsGranularity) {
  const starts = await seriesCount("subscriptions", "started_at", r, g, "status = 'active'", []);
  const ends = await seriesCount("subscriptions", "ended_at", r, g, "ended_at IS NOT NULL", []);

  const startMs = parseIsoDateOnly(r.start)?.getTime() ?? 0;
  const [[baseRow]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) as n FROM subscriptions WHERE status = 'active' AND started_at < ? AND (ended_at IS NULL OR ended_at >= ?)",
    [r.start, r.start]
  );
  let active = Number(baseRow?.n ?? 0);

  const buckets = new Set<string>();
  for (const s of starts) buckets.add(s.t);
  for (const e of ends) buckets.add(e.t);

  const bucketList = Array.from(buckets).sort((a, b) => {
    const da = parseIsoDateOnly(a)?.getTime() ?? startMs;
    const db = parseIsoDateOnly(b)?.getTime() ?? startMs;
    return da - db;
  });

  const startsMap = new Map(starts.map((x) => [x.t, x.n]));
  const endsMap = new Map(ends.map((x) => [x.t, x.n]));

  const out: SeriesRow[] = [];
  for (const t of bucketList) {
    active += Number(startsMap.get(t) ?? 0);
    active -= Number(endsMap.get(t) ?? 0);
    if (active < 0) active = 0;
    out.push({ t, n: active });
  }

  return out;
}

function mergeSeries(current: SeriesRow[], compare: SeriesRow[] | null, currentRange: AdminAnalyticsRange, compareRange: AdminAnalyticsRange | null) {
  const shiftMs = compareRange ? deltaStartMs(currentRange, compareRange) : 0;
  const compareAligned = compareRange ? (compare ?? []).map((r) => ({ ...r, t: alignCompareT(r.t, shiftMs) })) : [];

  const cMap = new Map(current.map((r) => [r.t, r.n]));
  const pMap = new Map(compareAligned.map((r) => [r.t, r.n]));
  const keys = Array.from(new Set([...cMap.keys(), ...pMap.keys()])).sort();

  return keys.map((t) => ({
    t,
    current: Number(cMap.get(t) ?? 0),
    compare: compareRange ? Number(pMap.get(t) ?? 0) : null,
  }));
}

export async function getAdminDashboardAnalytics(q: AdminDashboardQuery) {
  const current = q.range;
  const compare = q.compare ?? null;

  const [kpiCurrent, signupsCurrent, subsStartedCurrent, subsEndedCurrent, activeSubsCurrent] = await Promise.all([
    kpis(current),
    seriesCount("users", "created_at", current, q.granularity),
    seriesCount("subscriptions", "started_at", current, q.granularity),
    seriesCount("subscriptions", "ended_at", current, q.granularity, "ended_at IS NOT NULL", []),
    activeSubscriptionsSeries(current, q.granularity),
  ]);

  let kpiCompare = null as any;
  let signupsCompare: SeriesRow[] | null = null;
  let subsStartedCompare: SeriesRow[] | null = null;
  let subsEndedCompare: SeriesRow[] | null = null;
  let activeSubsCompare: SeriesRow[] | null = null;

  if (compare) {
    [kpiCompare, signupsCompare, subsStartedCompare, subsEndedCompare, activeSubsCompare] = await Promise.all([
      kpis(compare),
      seriesCount("users", "created_at", compare, q.granularity),
      seriesCount("subscriptions", "started_at", compare, q.granularity),
      seriesCount("subscriptions", "ended_at", compare, q.granularity, "ended_at IS NOT NULL", []),
      activeSubscriptionsSeries(compare, q.granularity),
    ]);
  }

  return {
    kpis: { current: kpiCurrent, compare: kpiCompare },
    series: {
      signups: mergeSeries(signupsCurrent, signupsCompare, current, compare),
      subscriptionsStarted: mergeSeries(subsStartedCurrent, subsStartedCompare, current, compare),
      subscriptionsEnded: mergeSeries(subsEndedCurrent, subsEndedCompare, current, compare),
      activeSubscriptions: mergeSeries(activeSubsCurrent, activeSubsCompare, current, compare),
    },
  };
}
