/**
 * Imports the station pub list (from nadrazky.eu, used with the owner's consent)
 * with station positions, regions and rail lines from Wikidata; the rail lines
 * themselves come from data/seed/rail-lines.json (railLines.ts), and all stations and
 * stops from the railway register (stations.ts).
 * Idempotent: re-running updates rows by their nadrazky.eu id.
 *
 *   npm run db:import
 *   npm run db:import -- --if-empty   only when there are no pubs yet (used on deploy)
 */
import { readFileSync } from "node:fs";
import { count, eq, sql } from "drizzle-orm";
import { openDb } from "./client";
import * as s from "./schema";
import { REGIONS } from "./regions";
import { readRailLines, syncRailLines } from "./railLines";
import { readStationMatcher, syncStations } from "./stations";
import { slugify } from "../lib/slug";
import { statusFromSource } from "../lib/status";

type SeedRow = {
  source_id: number;
  source_url: string;
  name: string;
  station: string;
  kind: "pub" | "restaurant" | "kiosk" | "cafe" | "unknown";
  status: "open" | "maybe_open" | "unknown";
  last_update_months_ago: number | "";
  lat: number;
  lon: number;
  region: string;
  rail_lines: string;
  wikidata_id: string;
  location_match: "exact" | "prefix" | "manual" | "review" | "none";
};

async function main() {
  const { db, close } = openDb();

  // Deploys only fill an empty database, so they never overwrite pubs fixed by hand.
  if (process.argv.includes("--if-empty")) {
    const [{ n }] = await db.select({ n: count() }).from(s.pubs);
    if (n > 0) {
      console.log(`Import skipped: ${n} pubs already in the database.`);
      await close();
      return;
    }
  }

  const rows: SeedRow[] = JSON.parse(readFileSync("data/seed/nadrazky-pubs-located.json", "utf8"));

  // Regions
  const regionRows = new Map<string, typeof s.regions.$inferInsert>();
  for (const [cs, r] of Object.entries(REGIONS)) {
    if (!regionRows.has(r.slug)) regionRows.set(r.slug, { slug: r.slug, nameCs: cs === "Hlavní město Praha" ? "Praha" : cs, nameEn: r.nameEn });
  }
  await db
    .insert(s.regions)
    .values([...regionRows.values()])
    .onConflictDoUpdate({ target: s.regions.slug, set: { nameCs: sql`excluded.name_cs`, nameEn: sql`excluded.name_en` } });

  // Rail lines come from the reviewed list; the pub list only links stations to them
  // ("Praha – Brno (010) | ..."), and only to numbers in that list.
  const { lines } = await syncRailLines(db);
  const known = new Set(readRailLines().map((l) => l.number));
  const stationLines = new Map<string, Set<string>>();
  for (const r of rows) {
    for (const part of r.rail_lines.split(" | ").filter(Boolean)) {
      const m = part.match(/^(.*) \((\d{3}[A-Z]?)\)$/);
      if (!m || !known.has(m[2])) continue;
      if (!stationLines.has(r.station)) stationLines.set(r.station, new Set());
      stationLines.get(r.station)!.add(m[2]);
    }
  }

  // Stations: all of them from the railway register, then the pub list's stations matched
  // to it by name. The few it doesn't list are kept under the pub list's name and position.
  await syncStations(db);
  const match = readStationMatcher();
  const idBySr70 = new Map(
    (await db.select({ id: s.stations.id, sr70: s.stations.sr70 }).from(s.stations)).flatMap((x) => (x.sr70 ? [[x.sr70, x.id] as const] : [])),
  );
  const stationIds = new Map<string, number>();
  for (const r of rows) {
    if (stationIds.has(r.station)) continue;
    const sr70 = match(r.station);
    const registered = sr70 ? idBySr70.get(sr70) : undefined;
    let st: { id: number };
    if (registered) {
      st = { id: registered };
      if (r.wikidata_id) await db.update(s.stations).set({ wikidataId: r.wikidata_id }).where(eq(s.stations.id, registered));
    } else {
      const region = REGIONS[r.region];
      [st] = await db
        .insert(s.stations)
        .values({
          slug: slugify(r.station),
          name: r.station,
          wikidataId: r.wikidata_id || null,
          regionSlug: region?.slug ?? null,
          lat: r.lat,
          lon: r.lon,
        })
        .onConflictDoUpdate({
          target: s.stations.slug,
          set: { name: sql`excluded.name`, wikidataId: sql`excluded.wikidata_id`, regionSlug: sql`excluded.region_slug`, lat: sql`excluded.lat`, lon: sql`excluded.lon` },
        })
        .returning({ id: s.stations.id });
    }
    stationIds.set(r.station, st.id);
    const nums = stationLines.get(r.station);
    if (nums?.size) {
      await db
        .insert(s.stationLines)
        .values([...nums].map((lineNumber) => ({ stationId: st.id, lineNumber })))
        .onConflictDoNothing();
    }
  }

  // Pubs
  const usedSlugs = new Set<string>();
  for (const r of rows) {
    let slug = slugify(`${r.station} ${r.name}`);
    if (usedSlugs.has(slug)) slug = `${slug}-${r.source_id}`;
    usedSlugs.add(slug);
    await db
      .insert(s.pubs)
      .values({
        slug,
        name: r.name,
        stationId: stationIds.get(r.station)!,
        kind: r.kind,
        status: statusFromSource(r.status),
        locationMatch: r.location_match,
        sourceId: r.source_id,
        sourceUrl: r.source_url,
        sourceLastUpdateMonthsAgo: r.last_update_months_ago === "" ? null : r.last_update_months_ago,
      })
      .onConflictDoUpdate({
        target: s.pubs.sourceId,
        set: {
          name: sql`excluded.name`,
          stationId: sql`excluded.station_id`,
          kind: sql`excluded.kind`,
          locationMatch: sql`excluded.location_match`,
          sourceLastUpdateMonthsAgo: sql`excluded.source_last_update_months_ago`,
          updatedAt: sql`now()`,
        },
      });
  }

  const [{ n }] = await db.select({ n: count() }).from(s.pubs);
  console.log(`Imported ${rows.length} rows: ${stationIds.size} stations, ${lines} rail lines, ${n} pubs in the database.`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
