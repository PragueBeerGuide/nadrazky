import "server-only";
import { and, count, desc, eq, gte, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { alias, unionAll } from "drizzle-orm/pg-core";
import { db, schema as s } from "@/db";
import type { Role } from "./auth/roles";
import {
  ACTIVITY_KINDS,
  ACTIVITY_PAGE,
  activeSince,
  rangeStart,
  USERS_PAGE,
  userStatus,
  type ActivityKind,
  type DashboardFilters,
} from "./adminFilters";
import { containsPattern } from "./friend";
import { avatarUrl } from "./profile";

const { appSuggestions, checkins, friendRequests, pubReports, pubs, regions, userBadges, users } = s;

/**
 * Data for the admin dashboard (/admin). Nothing here checks who asks; the page
 * calls requireAdminPage first.
 */

/** Totals for the tiles at the top of the dashboard. */
export async function dashboardStats(now = new Date()) {
  const week = new Date(now.getTime() - 7 * 24 * 3600_000);
  const finished = and(isNotNull(users.username), isNotNull(users.adultConfirmedAt));
  const [[u], [newUsers], [c], [r], [sg]] = await Promise.all([
    db.select({ total: count(), finished: sql<number>`count(*) filter (where ${finished})`.mapWith(Number) }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, week)),
    db
      .select({ count: count(), users: sql<number>`count(distinct ${checkins.userId})`.mapWith(Number) })
      .from(checkins)
      .where(gte(checkins.createdAt, week)),
    db.select({ count: count() }).from(pubReports).where(eq(pubReports.status, "open")),
    db.select({ count: count() }).from(appSuggestions).where(eq(appSuggestions.status, "pending")),
  ]);
  return {
    users: u.total,
    unfinished: u.total - u.finished,
    newUsersWeek: newUsers.count,
    checkinsWeek: c.count,
    checkinUsersWeek: c.users,
    openReports: r.count,
    pendingSuggestions: sg.count,
  };
}

/**
 * The user's latest check-in, report or suggestion; null if they have none. Written out with
 * table names, since Drizzle leaves columns unqualified when selecting from one table and
 * "user_id" = "id" would then compare within the subquery.
 */
const lastActiveAt = sql<Date | null>`greatest(
  (select max(c.created_at) from checkins c where c.user_id = "users"."id"),
  (select max(r.created_at) from pub_reports r where r.user_id = "users"."id"),
  (select max(s.created_at) from app_suggestions s where s.user_id = "users"."id")
)`;
const checkinCount = sql<number>`(select count(*) from checkins c where c.user_id = "users"."id")`.mapWith(Number);
const finishedSql = sql<boolean>`(${users.username} is not null and ${users.adultConfirmedAt} is not null)`;

export type AdminUserRow = Awaited<ReturnType<typeof listUsersForAdmin>>["rows"][number];

/** Users, newest first, by status, role and a search in username, name and email; one page at a time. */
export async function listUsersForAdmin(filters: DashboardFilters["users"], now = new Date()) {
  const where: (SQL | undefined)[] = [];
  if (filters.role) where.push(eq(users.role, filters.role));
  if (filters.q) {
    const p = containsPattern(filters.q);
    where.push(or(ilike(users.username, p), ilike(users.name, p), ilike(users.email, p)));
  }
  const since = activeSince(now);
  if (filters.status === "unfinished") where.push(sql`not ${finishedSql}`);
  if (filters.status === "active") where.push(and(finishedSql, sql`${lastActiveAt} >= ${since}`));
  if (filters.status === "inactive") where.push(and(finishedSql, sql`coalesce(${lastActiveAt} < ${since}, true)`));

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        avatarUpdatedAt: users.avatarUpdatedAt,
        finished: finishedSql,
        lastActiveAt: lastActiveAt.mapWith((v: Date | string | null) => (v ? new Date(v) : null)),
        checkins: checkinCount,
      })
      .from(users)
      .where(and(...where))
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(USERS_PAGE)
      .offset((filters.page - 1) * USERS_PAGE),
    db.select({ count: count() }).from(users).where(and(...where)),
  ]);
  return {
    total: total.count,
    rows: rows.map(({ avatarUpdatedAt, ...u }) => ({
      ...u,
      role: u.role as Role,
      avatarUrl: avatarUrl(u.id, avatarUpdatedAt),
      status: userStatus({ finished: u.finished, lastActiveAt: u.lastActiveAt }, now),
    })),
  };
}

const recipient = alias(users, "recipient");

/**
 * One kind of activity as the columns every kind shares: who, when, and what it was about.
 * `subject` is a pub or region name, `slug` what to link to, `detail` a short extra.
 */
type Arm = { at: SQL | typeof users.createdAt; userId: SQL; username: SQL; email: SQL; subject: SQL; slug: SQL; detail: SQL };

const none = sql<string | null>`null::text`;

function shape(kind: ActivityKind, a: Arm) {
  return {
    kind: sql<ActivityKind>`${kind}::text`.as("kind"),
    at: sql<Date>`${a.at}`.as("at"),
    userId: sql<string | null>`${a.userId}`.as("user_id"),
    username: sql<string | null>`${a.username}`.as("username"),
    email: sql<string | null>`${a.email}`.as("email"),
    subject: sql<string | null>`${a.subject}`.as("subject"),
    slug: sql<string | null>`${a.slug}`.as("slug"),
    detail: sql<string | null>`${a.detail}`.as("detail"),
  };
}

const signupQuery = (a: Arm, where: SQL | undefined) => db.select(shape("signup", a)).from(users).where(where);
/** The type of one kind's query, as unionAll wants all of them to have. */
type ArmQuery = ReturnType<typeof signupQuery>;

/** Each kind's query, filtered by time and search before they are put together. */
function armQuery(kind: ActivityKind, since: Date | null, q: string) {
  const col = (c: unknown) => sql`${c}`;
  const filters = (a: Arm) => {
    const parts: (SQL | undefined)[] = [];
    if (since) parts.push(sql`${a.at} >= ${since}`);
    if (q) parts.push(sql`concat_ws(' ', ${a.username}, ${a.email}, ${a.subject}, ${a.detail}) ilike ${containsPattern(q)}`);
    return and(...parts);
  };
  switch (kind) {
    case "signup": {
      const a: Arm = { at: users.createdAt, userId: col(users.id), username: col(users.username), email: col(users.email), subject: none, slug: none, detail: none };
      return signupQuery(a, filters(a));
    }
    case "checkin": {
      const a: Arm = {
        at: col(checkins.createdAt),
        userId: col(users.id),
        username: col(users.username),
        email: col(users.email),
        subject: col(pubs.name),
        slug: sql`case when ${pubs.deletedAt} is null then ${pubs.slug} end`,
        detail: sql`${checkins.beers}::text || '/' || ${checkins.shots}::text`,
      };
      return db.select(shape(kind, a)).from(checkins).innerJoin(users, eq(users.id, checkins.userId)).innerJoin(pubs, eq(pubs.id, checkins.pubId)).where(filters(a));
    }
    case "report": {
      const a: Arm = {
        at: col(pubReports.createdAt),
        userId: col(users.id),
        username: col(users.username),
        email: col(users.email),
        subject: col(pubs.name),
        slug: sql`case when ${pubs.deletedAt} is null then ${pubs.slug} end`,
        detail: sql`${pubReports.kind}::text`,
      };
      return db.select(shape(kind, a)).from(pubReports).innerJoin(users, eq(users.id, pubReports.userId)).innerJoin(pubs, eq(pubs.id, pubReports.pubId)).where(filters(a));
    }
    case "suggestion": {
      const a: Arm = {
        at: col(appSuggestions.createdAt),
        userId: col(users.id),
        username: col(users.username),
        email: col(users.email),
        subject: none,
        slug: none,
        detail: sql`left(${appSuggestions.message}, 140)`,
      };
      return db.select(shape(kind, a)).from(appSuggestions).leftJoin(users, eq(users.id, appSuggestions.userId)).where(filters(a));
    }
    case "friend": {
      const a: Arm = {
        at: col(friendRequests.createdAt),
        userId: col(users.id),
        username: col(users.username),
        email: col(users.email),
        subject: col(recipient.username),
        slug: none,
        detail: sql`${friendRequests.status}::text`,
      };
      return db
        .select(shape(kind, a))
        .from(friendRequests)
        .innerJoin(users, eq(users.id, friendRequests.requesterId))
        .innerJoin(recipient, eq(recipient.id, friendRequests.recipientId))
        .where(filters(a));
    }
    case "badge": {
      const a: Arm = {
        at: col(userBadges.earnedAt),
        userId: col(users.id),
        username: col(users.username),
        email: col(users.email),
        subject: col(regions.nameCs),
        slug: col(userBadges.badge),
        detail: sql`case when ${userBadges.complete} then 'complete' else ${userBadges.level}::text end`,
      };
      return db
        .select(shape(kind, a))
        .from(userBadges)
        .innerJoin(users, eq(users.id, userBadges.userId))
        .leftJoin(regions, eq(userBadges.badge, sql`'region:' || ${regions.slug}`))
        .where(filters(a));
    }
    case "pubDeleted": {
      const a: Arm = {
        at: col(pubs.deletedAt),
        userId: col(users.id),
        username: col(users.username),
        email: col(users.email),
        subject: col(pubs.name),
        slug: none,
        detail: none,
      };
      return db.select(shape(kind, a)).from(pubs).leftJoin(users, eq(users.id, pubs.deletedBy)).where(and(isNotNull(pubs.deletedAt), filters(a)));
    }
  }
}

export type ActivityRow = Awaited<ReturnType<typeof listActivity>>["rows"][number];

/**
 * What happened in the app, newest first: sign-ups, check-ins, reports, suggestions, friend
 * requests, badges and deleted pubs, by kind, time range and a search in who and what.
 * Fetches one row more than a page to tell whether there is a next one.
 */
export async function listActivity(filters: DashboardFilters["activity"], now = new Date()) {
  const since = rangeStart(filters.range, now);
  const kinds = filters.kind ? [filters.kind] : ACTIVITY_KINDS;
  // Every kind selects the same columns; only the joins' nullability differs, which unionAll's types don't allow for.
  const [first, ...rest] = kinds.map((k) => armQuery(k, since, filters.q) as unknown as ArmQuery);
  const query = rest.length ? unionAll(first, ...(rest as [typeof first])) : first;
  const rows = await query
    .orderBy(sql`"at" desc`)
    .limit(ACTIVITY_PAGE + 1)
    .offset((filters.page - 1) * ACTIVITY_PAGE);
  return {
    hasMore: rows.length > ACTIVITY_PAGE,
    rows: rows.slice(0, ACTIVITY_PAGE).map((r) => ({ ...r, at: new Date(r.at) })),
  };
}
