import "server-only";
import { cache } from "react";
import { and, asc, count, countDistinct, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import {
  BADGE_STEP,
  badgeKey,
  badgeProgress,
  earnedLevels,
  parseBadgeKey,
  type BadgeKey,
  type BadgeKind,
  type BadgeProgress,
  type BadgeVisit,
} from "./badges";
import { livePub, stationLineNumbers } from "./queries";

const { checkins, pubs, stations, stationLines, railLines, regions, userBadges } = s;

/** Pubs count towards completing a badge unless they are closed. */
const notClosed = ne(pubs.status, "closed");

/** Pubs that aren't closed, per line, per region and in all. */
const openTotals = cache(async () => {
  const [lines, regionRows, [all]] = await Promise.all([
    db
      .select({ line: stationLines.lineNumber, n: countDistinct(pubs.id) })
      .from(stationLines)
      .innerJoin(pubs, eq(pubs.stationId, stationLines.stationId))
      .where(and(livePub, notClosed))
      .groupBy(stationLines.lineNumber),
    db
      .select({ region: stations.regionSlug, n: count() })
      .from(pubs)
      .innerJoin(stations, eq(stations.id, pubs.stationId))
      .where(and(livePub, notClosed))
      .groupBy(stations.regionSlug),
    db.select({ n: count() }).from(pubs).where(and(livePub, notClosed)),
  ]);
  const totals = new Map<BadgeKey, number>([["pubs", all?.n ?? 0]]);
  for (const r of lines) totals.set(badgeKey("line", r.line), r.n);
  for (const r of regionRows) if (r.region) totals.set(badgeKey("region", r.region), r.n);
  return totals;
});

export type PubVisit = BadgeVisit & { pubId: number; closed: boolean; region: string | null; lines: string[] };

/** The user's first check-in at each pub that isn't deleted, oldest first. */
const firstVisits = cache(async (userId: string): Promise<PubVisit[]> => {
  const rows = await db
    .selectDistinctOn([checkins.pubId], {
      pubId: checkins.pubId,
      checkinId: checkins.id,
      at: checkins.createdAt,
      closed: sql<boolean>`${pubs.status} = 'closed'`,
      region: stations.regionSlug,
      lines: stationLineNumbers,
    })
    .from(checkins)
    .innerJoin(pubs, eq(pubs.id, checkins.pubId))
    .innerJoin(stations, eq(stations.id, pubs.stationId))
    .where(and(eq(checkins.userId, userId), livePub))
    .orderBy(checkins.pubId, asc(checkins.createdAt), asc(checkins.id));
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime() || a.checkinId - b.checkinId);
});

export type BadgeStanding = {
  key: BadgeKey;
  kind: BadgeKind;
  id: string;
  /** First visits to the badge's pubs, oldest first. */
  visits: PubVisit[];
  /** Pubs to visit for the last level: those that aren't closed, and closed ones the user did visit. */
  total: number;
};

/**
 * Every badge there is (each line and region with a pub that isn't closed, and Nádražák)
 * with what the user has visited of it; without a user, with no visits.
 */
export async function getBadgeStandings(userId?: string) {
  const [totals, visits] = await Promise.all([openTotals(), userId ? firstVisits(userId) : []]);
  const standings = new Map<BadgeKey, BadgeStanding>();
  const standing = (key: BadgeKey) => {
    let st = standings.get(key);
    if (!st) {
      const { kind, id } = parseBadgeKey(key)!;
      st = { key, kind, id, visits: [], total: totals.get(key) ?? 0 };
      standings.set(key, st);
    }
    return st;
  };
  for (const key of totals.keys()) if (totals.get(key)) standing(key);
  for (const v of visits) {
    const keys: BadgeKey[] = ["pubs", ...v.lines.map((n) => badgeKey("line", n))];
    if (v.region) keys.push(badgeKey("region", v.region));
    for (const key of keys) {
      const st = standing(key);
      st.visits.push(v);
      if (v.closed) st.total++;
    }
  }
  return standings;
}

/**
 * Saves every badge level the user has reached and hasn't been given yet. Levels reached by
 * `newCheckinId` wait for the "new badge" popup; any others (reached before badges existed)
 * count as seen. A level that becomes the last one, because pubs closed, turns complete.
 */
export async function syncBadges(userId: string, newCheckinId?: number) {
  const [standings, saved] = await Promise.all([
    getBadgeStandings(userId),
    db.select({ badge: userBadges.badge, level: userBadges.level, complete: userBadges.complete }).from(userBadges).where(eq(userBadges.userId, userId)),
  ]);
  const have = new Map(saved.map((r) => [`${r.badge}#${r.level}`, r.complete]));
  const now = new Date();
  const rows = [...standings.values()].flatMap((st) =>
    earnedLevels(st.visits, st.total, BADGE_STEP[st.kind])
      // Only what is new: a level not saved yet, or one that has just become complete.
      .filter((l) => {
        const complete = have.get(`${st.key}#${l.level}`);
        return complete === undefined || (l.complete && !complete);
      })
      .map((l) => ({
        userId,
        badge: st.key,
        level: l.level,
        complete: l.complete,
        checkinId: l.checkinId,
        earnedAt: l.earnedAt,
        seenAt: l.checkinId === newCheckinId ? null : now,
      })),
  );
  if (!rows.length) return;
  await db
    .insert(userBadges)
    .values(rows)
    .onConflictDoUpdate({
      target: [userBadges.userId, userBadges.badge, userBadges.level],
      set: { complete: true },
      setWhere: sql`excluded.complete and not ${userBadges.complete}`,
    });
}

/** Per badge, the highest level the user has been given, whether it was ever completed, and when last raised. */
async function getEarned(userId: string) {
  const rows = await db
    .select({
      badge: userBadges.badge,
      level: max(userBadges.level),
      complete: sql<boolean>`bool_or(${userBadges.complete})`,
      at: max(userBadges.earnedAt),
    })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))
    .groupBy(userBadges.badge);
  return new Map(rows.map((r) => [r.badge as BadgeKey, { level: r.level ?? 0, complete: r.complete, at: r.at }]));
}

/** Names of lines and regions; line names are in Czech only. */
const badgeNames = cache(async () => {
  const [lines, regionRows] = await Promise.all([
    db.select({ number: railLines.number, name: railLines.nameCs }).from(railLines),
    db.select().from(regions),
  ]);
  return {
    lines: new Map(lines.map((l) => [l.number, l.name])),
    regions: new Map(regionRows.map((r) => [r.slug, { cs: r.nameCs, en: r.nameEn }])),
  };
});

export type BadgeView = {
  key: BadgeKey;
  kind: BadgeKind;
  id: string;
  /** The line's route, or the region's name; empty for Nádražák. */
  name: string;
  progress: BadgeProgress;
  /** The level shown: earned levels stay even when pubs are added later. */
  level: number;
  complete: boolean;
  /** Pubs added since the badge was completed. */
  newPubs: number;
  earnedAt: Date | null;
  visitedPubIds: Set<number>;
};

/**
 * The badges with the user's level and progress; without a user, all locked. Pages that show
 * earned levels call syncBadges first, for levels reached before badges existed.
 */
export async function listBadges(locale: "cs" | "en", userId?: string): Promise<BadgeView[]> {
  const [standings, earned, names] = await Promise.all([getBadgeStandings(userId), userId ? getEarned(userId) : new Map(), badgeNames()]);
  return [...standings.values()].map((st) => {
    const progress = badgeProgress(st.visits.length, st.total, BADGE_STEP[st.kind]);
    const got = earned.get(st.key);
    const complete = Boolean(got?.complete) || progress.complete;
    return {
      key: st.key,
      kind: st.kind,
      id: st.id,
      name: st.kind === "line" ? (names.lines.get(st.id) ?? "") : st.kind === "region" ? (names.regions.get(st.id)?.[locale] ?? st.id) : "",
      progress,
      level: Math.max(got?.level ?? 0, progress.level),
      complete,
      newPubs: complete && !progress.complete ? st.total - st.visits.length : 0,
      earnedAt: got?.at ?? null,
      visitedPubIds: new Set(st.visits.map((v) => v.pubId)),
    };
  });
}

/** One badge as listBadges shows it, or null if there is no such badge. */
export async function getBadge(key: BadgeKey, locale: "cs" | "en", userId?: string) {
  return (await listBadges(locale, userId)).find((b) => b.key === key) ?? null;
}

/** The levels of one badge the user has been given, with the pub whose check-in reached each. */
export async function listBadgeLevels(userId: string, key: BadgeKey) {
  return db
    .select({ level: userBadges.level, complete: userBadges.complete, earnedAt: userBadges.earnedAt, pubName: pubs.name, pubSlug: pubs.slug })
    .from(userBadges)
    .leftJoin(checkins, eq(checkins.id, userBadges.checkinId))
    .leftJoin(pubs, and(eq(pubs.id, checkins.pubId), livePub))
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badge, key)))
    .orderBy(desc(userBadges.level));
}

export type NewBadge = { ids: number[]; key: BadgeKey; level: number; complete: boolean };

/** Levels the user hasn't seen the popup for, one entry per badge with its highest new level. */
export async function listUnseenBadges(userId: string): Promise<NewBadge[]> {
  const rows = await db
    .select({ id: userBadges.id, badge: userBadges.badge, level: userBadges.level, complete: userBadges.complete })
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), isNull(userBadges.seenAt)))
    .orderBy(asc(userBadges.earnedAt), asc(userBadges.level));
  const byBadge = new Map<BadgeKey, NewBadge>();
  for (const r of rows) {
    const key = r.badge as BadgeKey;
    const entry = byBadge.get(key) ?? { ids: [], key, level: 0, complete: false };
    entry.ids.push(r.id);
    entry.level = Math.max(entry.level, r.level);
    entry.complete ||= r.complete;
    byBadge.set(key, entry);
  }
  // Nádražák first, then lines, then regions, as on the badges page.
  const order: Record<BadgeKind, number> = { pubs: 0, line: 1, region: 2 };
  return [...byBadge.values()].sort((a, b) => order[parseBadgeKey(a.key)!.kind] - order[parseBadgeKey(b.key)!.kind]);
}

export async function markBadgesSeen(userId: string, ids: number[]) {
  if (!ids.length) return;
  await db
    .update(userBadges)
    .set({ seenAt: new Date() })
    .where(and(eq(userBadges.userId, userId), inArray(userBadges.id, ids), isNull(userBadges.seenAt)));
}
