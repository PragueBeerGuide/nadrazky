/**
 * The rail lines, by their number in the passenger timetable, as reviewed by hand
 * in data/seed/rail-lines.json. Syncing makes the rail_lines table match that file:
 * new lines are added, names updated, and lines no longer listed deleted
 * (with their station links).
 *
 *   npm run db:rail-lines
 */
import { readFileSync } from "node:fs";
import { notInArray, sql } from "drizzle-orm";
import type { Db } from "./client";
import * as s from "./schema";

export type RailLineSeed = { number: string; nameCs: string };

export function readRailLines(): RailLineSeed[] {
  return JSON.parse(readFileSync("data/seed/rail-lines.json", "utf8"));
}

export async function syncRailLines(db: Db, lines = readRailLines()) {
  await db
    .insert(s.railLines)
    .values(lines)
    .onConflictDoUpdate({ target: s.railLines.number, set: { nameCs: sql`excluded.name_cs` } });
  const deleted = await db
    .delete(s.railLines)
    .where(
      notInArray(
        s.railLines.number,
        lines.map((l) => l.number),
      ),
    )
    .returning({ number: s.railLines.number });
  return { lines: lines.length, deleted: deleted.map((d) => d.number) };
}
