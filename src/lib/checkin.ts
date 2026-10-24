import { z } from "zod";

export const NOTE_MAX = 280;
/** The most beers or shots one check-in can count. */
export const AMOUNT_MAX = 10;
export const TIME_ZONE = "Europe/Prague";

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

/**
 * What a check-in changes on its pub: every check-in confirms the pub now ("last confirmed"),
 * and one that found it open marks it open. Finding it closed once doesn't close it; that
 * takes a report.
 */
export function pubChangeAfterCheckIn(pubWasOpen: boolean, now: Date) {
  return {
    lastConfirmedAt: now,
    updatedAt: now,
    ...(pubWasOpen ? { status: "open" as const, closedYear: null } : {}),
  };
}

const tick = z.preprocess((v) => v === "on" || v === "true", z.boolean());
/** Empty form fields are missing values, not zero. */
const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

const amount = z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(AMOUNT_MAX).optional());

/**
 * The check-in form as posted: the pub and the optional details. Ticking beer or a shot
 * needs an amount (1–10); the result counts them as `beers` and `shots`, 0 when not ticked.
 */
export const checkInSchema = z
  .object({
    slug: z.string().min(1),
    hadBeer: tick,
    beerCount: amount,
    hadShot: tick,
    shotCount: amount,
    hadNonAlcoholic: tick,
    hadFood: tick,
    rating: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(5).optional()),
    note: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
      z.string().max(NOTE_MAX).optional(),
    ),
    pubWasOpen: z.enum(["open", "closed"]).transform((v) => v === "open"),
  })
  .superRefine((c, ctx) => {
    if (c.hadBeer && !c.beerCount) ctx.addIssue({ code: "custom", path: ["beerCount"], message: "required" });
    if (c.hadShot && !c.shotCount) ctx.addIssue({ code: "custom", path: ["shotCount"], message: "required" });
  })
  .transform(({ hadBeer, beerCount, hadShot, shotCount, ...rest }) => ({
    ...rest,
    beers: hadBeer ? (beerCount ?? 0) : 0,
    shots: hadShot ? (shotCount ?? 0) : 0,
  }));
