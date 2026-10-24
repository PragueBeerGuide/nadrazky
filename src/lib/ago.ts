import { checkInDay } from "./checkin";

type RecentKey = "today" | "yesterday" | "thisWeek";
type AgoKey = "months" | "years" | "monthsShort" | "yearsShort" | "unknown" | RecentKey | `${RecentKey}Short`;

/** Translator for the `ago` messages namespace. */
export type AgoTranslator = (key: AgoKey, values?: { count: number }) => string;

const DAY_MS = 86_400_000;
/** Days since 1970 of a moment's calendar day in Prague. */
const pragueDay = (d: Date) => Date.parse(`${checkInDay(d)}T00:00:00Z`) / DAY_MS;

/**
 * "today", "yesterday" or "thisWeek" (since Monday) for a recent moment, by calendar days in
 * Prague; null for anything older. A moment slightly in the future (clock skew) is today.
 */
export function recentDay(date: Date | string, now = new Date()): RecentKey | null {
  const today = pragueDay(now);
  const diff = today - pragueDay(new Date(date));
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  const weekday = (new Date(today * DAY_MS).getUTCDay() + 6) % 7; // Monday = 0
  return diff <= weekday ? "thisWeek" : null;
}

/**
 * "today", "yesterday" or "this week" when there is a recent `date`; otherwise "2 months ago"
 * up to two years, then "4 years ago". `short` gives "this wk" / "2 mo" / "4 yr".
 */
export function formatAgo(
  t: AgoTranslator,
  months: number | null | undefined,
  short = false,
  date?: Date | string | null,
  now = new Date(),
) {
  const recent = date ? recentDay(date, now) : null;
  if (recent) return short ? t(`${recent}Short`) : t(recent);
  if (months == null) return t("unknown");
  if (months < 24) return short ? t("monthsShort", { count: months }) : t("months", { count: months });
  const years = Math.floor(months / 12);
  return short ? t("yearsShort", { count: years }) : t("years", { count: years });
}

type Confirmed = { lastConfirmedAt: Date | string | null; monthsAgo: number | null };

/**
 * Most recently confirmed first: by the date of the latest check-in or approved open/closed
 * report, then (for pubs without one) by nadrazky.eu's months. The board and the map show only
 * months, but within a month the order still follows the actual dates.
 */
export function compareLastConfirmed(a: Confirmed, b: Confirmed) {
  const at = a.lastConfirmedAt ? new Date(a.lastConfirmedAt).getTime() : null;
  const bt = b.lastConfirmedAt ? new Date(b.lastConfirmedAt).getTime() : null;
  if (at !== null && bt !== null) return bt - at;
  if (at !== null) return -1;
  if (bt !== null) return 1;
  return (a.monthsAgo ?? Infinity) - (b.monthsAgo ?? Infinity);
}
