/**
 * Imports the station pub list (from nadrazky.eu, used with the owner's consent)
 * with station positions, regions and rail lines from Wikidata.
 * Idempotent: re-running updates rows by their nadrazky.eu id.
 *
 *   npm run db:import
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as s from "./schema";
import { REGIONS } from "./regions";
import { slugify } from "../lib/slug";

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

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });

async function main() {
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

  // Rail lines: "Praha – Brno (010) | ..." -> number + name
  const lines = new Map<string, string>();
  const stationLines = new Map<string, Set<string>>();
  for (const r of rows) {
    for (const part of r.rail_lines.split(" | ").filter(Boolean)) {
      const m = part.match(/^(.*) \((\d{3}[A-Z]?)\)$/);
      if (!m) continue;
      lines.set(m[2], m[1].trim());
      if (!stationLines.has(r.station)) stationLines.set(r.station, new Set());
      stationLines.get(r.station)!.add(m[2]);
    }
  }
  if (lines.size) {
    await db
      .insert(s.railLines)
      .values([...lines].map(([number, nameCs]) => ({ number, nameCs })))
      .onConflictDoUpdate({ target: s.railLines.number, set: { nameCs: sql`excluded.name_cs` } });
  }

  // Stations (one per station name in the source list)
  const stationIds = new Map<string, number>();
  for (const r of rows) {
    if (stationIds.has(r.station)) continue;
    const region = REGIONS[r.region];
    const [st] = await db
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
        status: r.status,
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

  const [{ n }] = await client`select count(*)::int as n from pubs`;
  console.log(`Imported ${rows.length} rows: ${stationIds.size} stations, ${lines.size} rail lines, ${n} pubs in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
