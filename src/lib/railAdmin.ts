import "server-only";
import { and, asc, eq, ilike, inArray, notExists, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { compareCzech } from "./czech";
import { fold } from "./slug";

const { stations, regions, railLines, stationLines } = s;

/**
 * Data for the admin pages that link stations and rail lines. Every function here
 * changes or shows rail data without checking who asks; the server actions check
 * canEditRailData first.
 */

/** Every rail line with how many stations it has, including lines with none yet. */
export async function listLinesForAdmin() {
  return db
    .select({
      number: railLines.number,
      name: railLines.nameCs,
      stationCount: sql<number>`count(${stationLines.stationId})`.mapWith(Number),
    })
    .from(railLines)
    .leftJoin(stationLines, eq(stationLines.lineNumber, railLines.number))
    .groupBy(railLines.number)
    .orderBy(asc(railLines.number));
}

/** The line numbers through a station, as a column: "010,230". */
const lineNumbers = sql<string[]>`(select coalesce(string_agg(${stationLines.lineNumber}, ',' order by ${stationLines.lineNumber}), '') from ${stationLines} where ${stationLines.stationId} = ${stations.id})`.mapWith(
  (v: string) => (v ? v.split(",") : []),
);

/** Stations matching the search (accent-insensitive), optionally only those without a line, in Czech order. */
export async function listStationsForAdmin(filters: { q?: string; withoutLine?: boolean } = {}) {
  const where = [];
  if (filters.q?.trim()) {
    where.push(ilike(sql`translate(lower(${stations.name}), ${ACCENTS}, ${PLAIN})`, `%${fold(filters.q.trim())}%`));
  }
  if (filters.withoutLine) {
    where.push(notExists(db.select({ one: sql`1` }).from(stationLines).where(eq(stationLines.stationId, stations.id))));
  }
  const rows = await db
    .select({ id: stations.id, slug: stations.slug, name: stations.name, region: regions.nameCs, lines: lineNumbers })
    .from(stations)
    .leftJoin(regions, eq(regions.slug, stations.regionSlug))
    .where(and(...where));
  return rows.sort((a, b) => compareCzech(a.name, b.name));
}

// As in queries.ts: compare folded text without a database extension.
const ACCENTS = "áäčďéěëíňóöřšťúůüýžľĺŕ";
const PLAIN = "aacdeeeinoorstuuuyzllr";

/** A station with the lines through it. */
export async function getStationForAdmin(slug: string) {
  const [station] = await db
    .select({ id: stations.id, slug: stations.slug, name: stations.name, region: regions.nameCs })
    .from(stations)
    .leftJoin(regions, eq(regions.slug, stations.regionSlug))
    .where(eq(stations.slug, slug))
    .limit(1);
  if (!station) return null;
  const lines = await db
    .select({ number: railLines.number, name: railLines.nameCs })
    .from(stationLines)
    .innerJoin(railLines, eq(railLines.number, stationLines.lineNumber))
    .where(eq(stationLines.stationId, station.id))
    .orderBy(asc(railLines.number));
  return { ...station, lines };
}

/** A rail line with its stations, in Czech order. */
export async function getLineForAdmin(number: string) {
  const [line] = await db.select({ number: railLines.number, name: railLines.nameCs }).from(railLines).where(eq(railLines.number, number)).limit(1);
  if (!line) return null;
  const rows = await db
    .select({ id: stations.id, slug: stations.slug, name: stations.name, region: regions.nameCs, lines: lineNumbers })
    .from(stationLines)
    .innerJoin(stations, eq(stations.id, stationLines.stationId))
    .leftJoin(regions, eq(regions.slug, stations.regionSlug))
    .where(eq(stationLines.lineNumber, number));
  return { ...line, stations: rows.sort((a, b) => compareCzech(a.name, b.name)) };
}

/** All station names, for picking one to add to a line. */
export async function listStationNames() {
  const rows = await db.select({ name: stations.name }).from(stations);
  return rows.map((r) => r.name).sort(compareCzech);
}

/** Links a station to the given lines; numbers that aren't a rail line come back as unknown. */
export async function addStationLines(stationId: number, numbers: string[]) {
  const known = numbers.length
    ? (await db.select({ number: railLines.number }).from(railLines).where(inArray(railLines.number, numbers))).map((r) => r.number)
    : [];
  if (known.length) {
    await db
      .insert(stationLines)
      .values(known.map((lineNumber) => ({ stationId, lineNumber })))
      .onConflictDoNothing();
  }
  return { added: known, unknown: numbers.filter((n) => !known.includes(n)) };
}

export async function removeStationLine(stationId: number, lineNumber: string) {
  await db.delete(stationLines).where(and(eq(stationLines.stationId, stationId), eq(stationLines.lineNumber, lineNumber)));
}

/** The station with exactly this name, ignoring case and accents if nothing matches exactly. */
export async function findStationByName(name: string) {
  const [exact] = await db.select({ id: stations.id, name: stations.name }).from(stations).where(eq(stations.name, name)).limit(1);
  if (exact) return exact;
  const folded = await db
    .select({ id: stations.id, name: stations.name })
    .from(stations)
    .where(sql`translate(lower(${stations.name}), ${ACCENTS}, ${PLAIN}) = ${fold(name)}`)
    .limit(2);
  return folded.length === 1 ? folded[0] : null;
}
