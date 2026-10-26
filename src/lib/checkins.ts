import "server-only";
import { and, count, countDistinct, desc, eq, gt, max, sql, type AnyColumn } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { checkInDay } from "./checkin";
import { livePub } from "./queries";

const { checkins, users, pubs, stations, stationLines, regions } = s;

/** How many check-ins a pub has and the latest one. */
export async function getCheckInSummary(pubId: number) {
  const [[total], [last]] = await Promise.all([
    db.select({ count: count() }).from(checkins).where(eq(checkins.pubId, pubId)),
    db
      .select({ createdAt: checkins.createdAt, pubWasOpen: checkins.pubWasOpen })
      .from(checkins)
      .where(eq(checkins.pubId, pubId))
      .orderBy(desc(checkins.createdAt))
      .limit(1),
  ]);
  return { count: total?.count ?? 0, last: last ?? null };
}

export type RecentCheckIn = Awaited<ReturnType<typeof listRecentCheckIns>>[number];

export async function listRecentCheckIns(pubId: number, limit = 5) {
  return db
    .select({
      id: checkins.id,
      createdAt: checkins.createdAt,
      username: users.username,
      userId: users.id,
      avatarUpdatedAt: users.avatarUpdatedAt,
      beers: checkins.beers,
      shots: checkins.shots,
      hadNonAlcoholic: checkins.hadNonAlcoholic,
      hadFood: checkins.hadFood,
      rating: checkins.rating,
      note: checkins.note,
      pubWasOpen: checkins.pubWasOpen,
    })
    .from(checkins)
    .innerJoin(users, eq(users.id, checkins.userId))
    .where(eq(checkins.pubId, pubId))
    .orderBy(desc(checkins.createdAt))
    .limit(limit);
}

/** The user's check-ins at a pub in the last two days: enough to apply the once-a-day rule. */
export async function recentCheckInTimes(userId: string, pubId: number, now = new Date()) {
  const since = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ createdAt: checkins.createdAt })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.pubId, pubId), gt(checkins.createdAt, since)));
  return rows.map((r) => r.createdAt);
}

export async function hasCheckedInToday(userId: string, pubId: number, now = new Date()) {
  const [row] = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.pubId, pubId), eq(checkins.day, checkInDay(now))))
    .limit(1);
  return Boolean(row);
}

/** A count of check-ins where a tick was set. */
const ticked = (column: AnyColumn) => sql<number>`count(*) filter (where ${column})`.mapWith(Number);
const asDate = (v: string | Date | null) => (v == null ? null : new Date(v));

/** The numbers on a user's profile: how much of the network they have covered. */
export async function getUserStats(userId: string) {
  const [[totals], [lines]] = await Promise.all([
    db
      .select({
        checkIns: count(),
        pubs: countDistinct(checkins.pubId),
        stations: countDistinct(pubs.stationId),
        regions: countDistinct(stations.regionSlug),
        beers: sql<number>`coalesce(sum(${checkins.beers}), 0)`.mapWith(Number),
        shots: sql<number>`coalesce(sum(${checkins.shots}), 0)`.mapWith(Number),
        nonAlcoholic: ticked(checkins.hadNonAlcoholic),
        food: ticked(checkins.hadFood),
        first: sql<Date | null>`min(${checkins.createdAt})`.mapWith(asDate),
      })
      .from(checkins)
      .innerJoin(pubs, eq(pubs.id, checkins.pubId))
      .innerJoin(stations, eq(stations.id, pubs.stationId))
      .where(and(eq(checkins.userId, userId), livePub)),
    db
      .select({ lines: countDistinct(stationLines.lineNumber) })
      .from(checkins)
      .innerJoin(pubs, eq(pubs.id, checkins.pubId))
      .innerJoin(stationLines, eq(stationLines.stationId, pubs.stationId))
      .where(and(eq(checkins.userId, userId), livePub)),
  ]);
  return { ...totals, lines: lines?.lines ?? 0 };
}

/** Every region with how many of its pubs the user has checked in at. */
export async function getRegionProgress(userId: string) {
  const visitedPub = sql`exists (select 1 from ${checkins} where ${checkins.pubId} = ${pubs.id} and ${checkins.userId} = ${userId})`;
  return db
    .select({
      slug: regions.slug,
      nameCs: regions.nameCs,
      nameEn: regions.nameEn,
      total: count(pubs.id),
      visited: sql<number>`count(${pubs.id}) filter (where ${visitedPub})`.mapWith(Number),
    })
    .from(regions)
    .leftJoin(stations, eq(stations.regionSlug, regions.slug))
    .leftJoin(pubs, and(eq(pubs.stationId, stations.id), livePub))
    .groupBy(regions.slug);
}

/** The pubs a user has checked in at, most recently visited first. */
export async function listVisitedPubs(userId: string) {
  return db
    .select({
      slug: pubs.slug,
      name: pubs.name,
      station: stations.name,
      visits: count(),
      last: max(checkins.createdAt),
    })
    .from(checkins)
    .innerJoin(pubs, eq(pubs.id, checkins.pubId))
    .innerJoin(stations, eq(stations.id, pubs.stationId))
    .where(and(eq(checkins.userId, userId), livePub))
    .groupBy(pubs.id, stations.name)
    .orderBy(desc(max(checkins.createdAt)));
}
