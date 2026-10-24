import "server-only";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { fold } from "./slug";
import { orderAlongLine } from "./lineOrder";

const { pubs, stations, regions, railLines, stationLines } = s;

export type PubStatus = (typeof s.pubStatus.enumValues)[number];
export type PubKind = (typeof s.pubKind.enumValues)[number];

/**
 * "Last confirmed" in whole months: since the latest check-in or approved open/closed report
 * when there is one, otherwise as nadrazky.eu last reported it.
 */
export const confirmedMonthsAgo = sql<number | null>`coalesce(
  (extract(year from age(now(), ${pubs.lastConfirmedAt})) * 12 + extract(month from age(now(), ${pubs.lastConfirmedAt})))::int,
  ${pubs.sourceLastUpdateMonthsAgo}
)`.mapWith((v: unknown) => (v == null ? null : Number(v)));

/** Columns shared by every pub listing. */
const pubListFields = {
  slug: pubs.slug,
  name: pubs.name,
  kind: pubs.kind,
  status: pubs.status,
  station: stations.name,
  stationSlug: stations.slug,
  stationId: stations.id,
  regionSlug: stations.regionSlug,
  regionCs: regions.nameCs,
  regionEn: regions.nameEn,
  monthsAgo: confirmedMonthsAgo,
  /** Rail line numbers through the station, ascending. */
  lines: sql<string[]>`(select coalesce(string_agg(${stationLines.lineNumber}, ',' order by ${stationLines.lineNumber}), '') from ${stationLines} where ${stationLines.stationId} = ${stations.id})`.mapWith(
    (v: string) => (v ? v.split(",") : []),
  ),
  lat: sql<number>`coalesce(${pubs.lat}, ${stations.lat})`,
  lon: sql<number>`coalesce(${pubs.lon}, ${stations.lon})`,
};

export type PubListItem = Awaited<ReturnType<typeof listPubs>>[number];

export async function listPubs(filters: {
  q?: string;
  region?: string;
  line?: string;
  status?: PubStatus[];
  limit?: number;
} = {}) {
  const where = [];
  if (filters.region) where.push(eq(stations.regionSlug, filters.region));
  if (filters.status?.length) where.push(inArray(pubs.status, filters.status));
  if (filters.line) {
    where.push(
      inArray(
        pubs.stationId,
        db.select({ id: stationLines.stationId }).from(stationLines).where(eq(stationLines.lineNumber, filters.line)),
      ),
    );
  }
  if (filters.q && filters.q.trim().length >= 2) {
    // Accent-insensitive: compare folded text on both sides.
    const term = `%${fold(filters.q.trim())}%`;
    where.push(
      or(
        ilike(sql`translate(lower(${pubs.name}), ${ACCENTS}, ${PLAIN})`, term),
        ilike(sql`translate(lower(${stations.name}), ${ACCENTS}, ${PLAIN})`, term),
      ),
    );
  }
  return db
    .select(pubListFields)
    .from(pubs)
    .innerJoin(stations, eq(stations.id, pubs.stationId))
    .leftJoin(regions, eq(regions.slug, stations.regionSlug))
    .where(and(...where))
    .orderBy(asc(stations.name), asc(pubs.name))
    .limit(filters.limit ?? 1000);
}

// Czech + common accents for SQL translate(); keeps the DB free of extensions.
const ACCENTS = "áäčďéěëíňóöřšťúůüýžľĺŕ";
const PLAIN = "aacdeeeinoorstuuuyzllr";

export async function getPub(slug: string) {
  const [row] = await db
    .select({
      pub: pubs,
      station: stations,
      region: regions,
      confirmedMonthsAgo,
    })
    .from(pubs)
    .innerJoin(stations, eq(stations.id, pubs.stationId))
    .leftJoin(regions, eq(regions.slug, stations.regionSlug))
    .where(eq(pubs.slug, slug))
    .limit(1);
  if (!row) return null;
  const lines = await db
    .select({ number: railLines.number, name: railLines.nameCs })
    .from(stationLines)
    .innerJoin(railLines, eq(railLines.number, stationLines.lineNumber))
    .where(eq(stationLines.stationId, row.station.id))
    .orderBy(asc(railLines.number));
  const neighbours = await db
    .select({ slug: pubs.slug, name: pubs.name, status: pubs.status, kind: pubs.kind })
    .from(pubs)
    .where(and(eq(pubs.stationId, row.station.id), sql`${pubs.id} <> ${row.pub.id}`));
  return { ...row, lines, neighbours };
}

export async function listRegions(locale: "cs" | "en" = "cs") {
  const rows = await db
    .select({
      slug: regions.slug,
      nameCs: regions.nameCs,
      nameEn: regions.nameEn,
      pubCount: count(pubs.id),
      openCount: sql<number>`count(*) filter (where ${pubs.status} = 'open')`.mapWith(Number),
    })
    .from(regions)
    .leftJoin(stations, eq(stations.regionSlug, regions.slug))
    .leftJoin(pubs, eq(pubs.stationId, stations.id))
    .groupBy(regions.slug);
  const collator = new Intl.Collator(locale);
  return rows.sort((a, b) => collator.compare(locale === "cs" ? a.nameCs : a.nameEn, locale === "cs" ? b.nameCs : b.nameEn));
}

export async function getRegion(slug: string) {
  const [region] = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1);
  return region ?? null;
}

export async function listLines() {
  return db
    .select({
      number: railLines.number,
      name: railLines.nameCs,
      pubCount: sql<number>`count(distinct ${pubs.id})`.mapWith(Number),
    })
    .from(railLines)
    .innerJoin(stationLines, eq(stationLines.lineNumber, railLines.number))
    .innerJoin(pubs, eq(pubs.stationId, stationLines.stationId))
    .groupBy(railLines.number)
    .orderBy(asc(railLines.number));
}

export async function getLine(number: string) {
  const [line] = await db.select().from(railLines).where(eq(railLines.number, number)).limit(1);
  return line ?? null;
}

export async function getTotals() {
  const [row] = await db
    .select({
      pubs: count(),
      open: sql<number>`count(*) filter (where ${pubs.status} = 'open')`.mapWith(Number),
      unknown: sql<number>`count(*) filter (where ${pubs.status} = 'unknown')`.mapWith(Number),
      stations: sql<number>`count(distinct ${pubs.stationId})`.mapWith(Number),
    })
    .from(pubs);
  return row;
}

/**
 * The stations of a rail line that have a pub, laid out as a route, each with its pubs.
 * The data has no stop sequence, so the order is estimated from station positions.
 */
export async function getLineStops(number: string, lineName: string) {
  const rows = await listPubs({ line: number });
  const byStation = new Map<number, LineStop>();
  for (const p of rows) {
    let stop = byStation.get(p.stationId);
    if (!stop) {
      stop = { stationId: p.stationId, station: p.station, lat: p.lat, lon: p.lon, pubs: [], best: "closed" };
      byStation.set(p.stationId, stop);
    }
    stop.pubs.push(p);
  }
  const stops = [...byStation.values()];
  for (const s of stops) {
    s.pubs.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    s.best = s.pubs[0].status;
  }
  return orderAlongLine(stops, lineName);
}

export type LineStop = {
  stationId: number;
  station: string;
  lat: number;
  lon: number;
  pubs: PubListItem[];
  best: PubStatus;
};

/** Lower is better: open pubs first. */
export const STATUS_RANK: Record<PubStatus, number> = { open: 0, unknown: 1, closed: 2 };
