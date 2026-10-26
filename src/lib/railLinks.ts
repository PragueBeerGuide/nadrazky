import { z } from "zod";

/** A timetable line number: three digits, as in data/seed/rail-lines.json. */
export const LINE_NUMBER = /^\d{3}$/;

/**
 * Line numbers typed or picked in the "add lines" field. Takes the options it offers
 * ("010 · Kolín – Česká Třebová") as well as several numbers at once ("010, 11 230"),
 * padding short ones to three digits. Unique, in the order given.
 */
export function parseLineNumbers(input: string): string[] {
  const picked = input.match(/^\s*(\d{1,3})\s*·/);
  const numbers = picked ? [picked[1]] : (input.match(/\d+/g) ?? []);
  return [...new Set(numbers.filter((n) => n.length <= 3).map((n) => n.padStart(3, "0")))];
}

/** The option text for a line in the "add lines" field; parseLineNumbers reads it back. */
export function lineOption(line: { number: string; name: string }) {
  return `${line.number} · ${line.name}`;
}

/** The station link forms as posted: add or remove, on a station page or a line page. */
export const stationLinesSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), stationId: z.coerce.number().int().positive(), lines: z.string().trim().min(1) }),
  z.object({ op: z.literal("remove"), stationId: z.coerce.number().int().positive(), line: z.string().regex(LINE_NUMBER) }),
]);

export const lineStationsSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), line: z.string().regex(LINE_NUMBER), station: z.string().trim().min(1) }),
  z.object({ op: z.literal("remove"), line: z.string().regex(LINE_NUMBER), stationId: z.coerce.number().int().positive() }),
]);

/** What an add or remove did, for the form to show; `unknown` lists what didn't match anything. */
export type LinkResult = { added?: string[]; removed?: string; unknown?: string[]; error?: "invalid" };
