import { z } from "zod";

/** How close (metres) the phone must be to the pub's point. Pub points are mostly the station's. */
export const CHECKIN_RADIUS_M = 300;
export const NOTE_MAX = 280;
export const TIME_ZONE = "Europe/Prague";

type Point = { lat: number; lon: number };

/** Great-circle distance in metres (haversine; plenty for a few hundred metres). */
export function distanceMeters(a: Point, b: Point) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinRadius(position: Point, pub: Point, radius = CHECKIN_RADIUS_M) {
  return distanceMeters(position, pub) <= radius;
}

/** The calendar day in Prague (YYYY-MM-DD) a moment belongs to; check-ins count once per day. */
export function checkInDay(at: Date) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** A user already has the one counted check-in at a pub for the day of `at`. */
export function alreadyCheckedIn(previous: Date[], at: Date) {
  const day = checkInDay(at);
  return previous.some((p) => checkInDay(p) === day);
}

export type CheckInVerdict = { ok: true; distance: number } | { ok: false; reason: "tooFar" | "alreadyToday"; distance: number };

/** Both rules together: close enough, and not yet checked in at this pub today. */
export function judgeCheckIn(position: Point, pub: Point, previous: Date[], at: Date): CheckInVerdict {
  const distance = Math.round(distanceMeters(position, pub));
  if (distance > CHECKIN_RADIUS_M) return { ok: false, reason: "tooFar", distance };
  if (alreadyCheckedIn(previous, at)) return { ok: false, reason: "alreadyToday", distance };
  return { ok: true, distance };
}

const tick = z.preprocess((v) => v === "on" || v === "true", z.boolean());
/** Empty form fields are missing values, not zero. */
const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

/** The check-in form as posted: the browser's position plus the optional details. */
export const checkInSchema = z.object({
  slug: z.string().min(1),
  lat: z.preprocess(blankToUndefined, z.coerce.number().min(-90).max(90)),
  lon: z.preprocess(blankToUndefined, z.coerce.number().min(-180).max(180)),
  accuracy: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  hadBeer: tick,
  hadShot: tick,
  hadNonAlcoholic: tick,
  hadSnack: tick,
  rating: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(5).optional()),
  note: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.string().max(NOTE_MAX).optional(),
  ),
  pubWasOpen: z.enum(["open", "closed"]).transform((v) => v === "open"),
});

/** "450 m" under a kilometre, then "1.2 km" ("1,2 km" in Czech). */
export function formatDistance(metres: number, locale: string) {
  return metres < 1000
    ? new Intl.NumberFormat(locale, { style: "unit", unit: "meter", maximumFractionDigits: 0 }).format(metres)
    : new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 }).format(metres / 1000);
}
