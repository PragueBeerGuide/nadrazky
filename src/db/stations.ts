/**
 * All railway stations and stops, from the register in data/seed/railway-stations.csv.
 * Syncing claims our existing stations by name (and data/seed/station-aliases.json),
 * merging two of ours that are the same register station, then adds or updates every register station by its SR70 number: official name, type,
 * region and position. Stations the register no longer lists are left as they are.
 *
 *   npm run db:stations
 */
import { readFileSync } from "node:fs";
import { eq, isNull, sql } from "drizzle-orm";
import type { Db } from "./client";
import * as s from "./schema";
import { REGIONS } from "./regions";
import { slugify } from "../lib/slug";
import { parseRegister, stationKey, stationMatcher, type RegisterStation } from "../lib/stationRegister";

export function readRegister(): RegisterStation[] {
  return parseRegister(readFileSync("data/seed/railway-stations.csv", "utf8"));
}

/** Matches a station name from the pub list (or anywhere) to its SR70 number. */
export function readStationMatcher(register = readRegister()) {
  const aliases: Record<string, string> = JSON.parse(readFileSync("data/seed/station-aliases.json", "utf8"));
  return stationMatcher(register, aliases);
}

const BATCH = 500;

export async function syncStations(db: Db, register = readRegister()) {
  const match = readStationMatcher(register);
  const inRegister = new Set(register.map((r) => r.sr70));

  // Claim the stations we have that the register lists, so they're updated, not duplicated.
  // Two of ours for one register station ("Chlumec" and "Chlumec nad Cidlinou") are merged:
  // the one named as the register names it keeps the pubs and lines of the other.
  const existing = await db.select({ id: s.stations.id, name: s.stations.name, sr70: s.stations.sr70 }).from(s.stations);
  const owner = new Map(existing.flatMap((e) => (e.sr70 ? [[e.sr70, e.id] as const] : [])));
  const officialName = new Map(register.map((r) => [r.sr70, stationKey(r.name)]));
  const unclaimed = existing
    .filter((e) => !e.sr70)
    .map((e) => ({ ...e, sr70: match(e.name) }))
    .filter((e): e is typeof e & { sr70: string } => e.sr70 !== null && inRegister.has(e.sr70))
    .sort((a, b) => Number(stationKey(b.name) === officialName.get(b.sr70)) - Number(stationKey(a.name) === officialName.get(a.sr70)));
  let claimed = 0;
  const merged: string[] = [];
  for (const e of unclaimed) {
    const into = owner.get(e.sr70);
    if (into === undefined) {
      await db.update(s.stations).set({ sr70: e.sr70 }).where(eq(s.stations.id, e.id));
      owner.set(e.sr70, e.id);
      claimed++;
      continue;
    }
    await db.update(s.pubs).set({ stationId: into }).where(eq(s.pubs.stationId, e.id));
    await db.execute(
      sql`insert into ${s.stationLines} (station_id, line_number) select ${into}, line_number from ${s.stationLines} where station_id = ${e.id} on conflict do nothing`,
    );
    await db.delete(s.stations).where(eq(s.stations.id, e.id));
    merged.push(e.name);
  }
  const taken = new Set(owner.keys());

  // Slugs from the official names; a clash (with a station outside the register, or a
  // name that folds the same) gets the SR70 number added.
  const outside = await db.select({ name: s.stations.name, slug: s.stations.slug }).from(s.stations).where(isNull(s.stations.sr70));
  const used = new Set(outside.map((o) => o.slug));
  const values = register.map((r) => {
    let slug = slugify(r.name);
    if (used.has(slug)) slug = `${slug}-${r.sr70}`;
    used.add(slug);
    return { sr70: r.sr70, slug, name: r.name, kind: r.kind, regionSlug: REGIONS[r.region]?.slug ?? null, lat: r.lat, lon: r.lon };
  });
  for (let i = 0; i < values.length; i += BATCH) {
    await db
      .insert(s.stations)
      .values(values.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: s.stations.sr70,
        set: {
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          kind: sql`excluded.kind`,
          regionSlug: sql`excluded.region_slug`,
          lat: sql`excluded.lat`,
          lon: sql`excluded.lon`,
        },
      });
  }

  return {
    stations: register.length,
    added: register.length - taken.size,
    claimed,
    /** Our stations merged into another one for the same register station. */
    merged,
    /** Our stations the register doesn't list, kept as they are. */
    outside: outside.map((o) => o.name),
  };
}
