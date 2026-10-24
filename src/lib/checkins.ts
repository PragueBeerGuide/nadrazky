import "server-only";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { checkInDay } from "./checkin";

const { checkins, users } = s;

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
      hadBeer: checkins.hadBeer,
      hadShot: checkins.hadShot,
      hadNonAlcoholic: checkins.hadNonAlcoholic,
      hadSnack: checkins.hadSnack,
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
