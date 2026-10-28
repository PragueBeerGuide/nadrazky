import { ROLES, type Role } from "./auth/roles";

/**
 * Filters on the admin dashboard, read from the page's query string. Anything unknown
 * falls back to "all", so a mistyped link still shows the dashboard.
 */

/** A user counts as active with a check-in, report or suggestion this many days back. */
export const ACTIVE_DAYS = 30;

/** "unfinished": signed in with Google but has no username or hasn't confirmed 18+ yet. */
export const USER_STATUSES = ["active", "inactive", "unfinished"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** What shows in the activity feed, one kind per table it comes from. */
export const ACTIVITY_KINDS = ["signup", "checkin", "report", "suggestion", "friend", "badge", "pubDeleted"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_RANGES = ["24h", "7d", "30d", "all"] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

const HOURS: Record<ActivityRange, number | null> = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24, all: null };

export const USERS_PAGE = 50;
export const ACTIVITY_PAGE = 50;
/** Search text longer than this is cut off. */
export const SEARCH_MAX = 100;

type Query = Record<string, string | string[] | undefined>;

const pick = <T extends string>(list: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;

const text = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, SEARCH_MAX) : "");

/** A page number from 1; anything else is 1. */
const page = (value: unknown) => {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 1 ? Math.min(n, 1000) : 1;
};

export type DashboardFilters = {
  users: { status: UserStatus | null; role: Role | null; q: string; page: number };
  activity: { kind: ActivityKind | null; range: ActivityRange; q: string; page: number };
};

/** Users are filtered by `status`, `role`, `uq` and `upage`; the activity feed by `kind`, `range`, `q` and `apage`. */
export function parseDashboardFilters(query: Query): DashboardFilters {
  return {
    users: { status: pick(USER_STATUSES, query.status), role: pick(ROLES, query.role), q: text(query.uq), page: page(query.upage) },
    activity: { kind: pick(ACTIVITY_KINDS, query.kind), range: pick(ACTIVITY_RANGES, query.range) ?? "7d", q: text(query.q), page: page(query.apage) },
  };
}

/** The filters back as a query string object, without the defaults, for links that change one of them. */
export function dashboardQuery(f: DashboardFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.users.status) out.status = f.users.status;
  if (f.users.role) out.role = f.users.role;
  if (f.users.q) out.uq = f.users.q;
  if (f.users.page > 1) out.upage = String(f.users.page);
  if (f.activity.kind) out.kind = f.activity.kind;
  if (f.activity.range !== "7d") out.range = f.activity.range;
  if (f.activity.q) out.q = f.activity.q;
  if (f.activity.page > 1) out.apage = String(f.activity.page);
  return out;
}

/** When the range starts, or null for all time. */
export function rangeStart(range: ActivityRange, now = new Date()) {
  const hours = HOURS[range];
  return hours === null ? null : new Date(now.getTime() - hours * 3600_000);
}

/** The start of the "active" window. */
export function activeSince(now = new Date()) {
  return new Date(now.getTime() - ACTIVE_DAYS * 24 * 3600_000);
}

/** The status of a user from their sign-up and their latest activity. */
export function userStatus(user: { finished: boolean; lastActiveAt: Date | null }, now = new Date()): UserStatus {
  if (!user.finished) return "unfinished";
  return user.lastActiveAt && user.lastActiveAt >= activeSince(now) ? "active" : "inactive";
}

