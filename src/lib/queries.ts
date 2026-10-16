import "server-only";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { fold } from "./slug";

const { pubs, stations, regions, railLines, stationLines } = s;

export type PubStatus = (typeof s.pubStatus.enumValues)[number];
export type PubKind = (typeof s.pubKind.enumValues)[number];

/** Columns shared by every pub listing. */
const pubListFields = {
  slug: pubs.slug,
  name: pubs.name,
  kind: pubs.kind,
  status: pubs.status,
  station: stations.name,
  stationSlug: stations.slug,
  regionSlug: stations.regionSlug,
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
    .select({ slug: pubs.slug, name: pubs.name, status: pubs.status })
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
      stations: sql<number>`count(distinct ${pubs.stationId})`.mapWith(Number),
    })
    .from(pubs);
  return row;
}
