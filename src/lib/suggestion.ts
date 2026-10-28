import { z } from "zod";

export const SUGGESTION_MIN = 5;
export const SUGGESTION_MAX = 2000;
const PAGE_MAX = 300;
/** Suggestions one signed-in user may send per Prague calendar day. */
export const DAILY_SUGGESTION_LIMIT = 5;
/** Signed-out visitors can't be told apart, so together they share one daily allowance. */
export const DAILY_ANONYMOUS_SUGGESTION_LIMIT = 50;

export function suggestionLimitReached(sentToday: number, signedIn: boolean) {
  return sentToday >= (signedIn ? DAILY_SUGGESTION_LIMIT : DAILY_ANONYMOUS_SUGGESTION_LIMIT);
}

/**
 * The suggestion form as posted. `page` is the path the visitor was on, kept only when it
 * looks like one of ours. `website` is a honeypot: people never see it, bots fill it in.
 */
export const suggestionSchema = z.object({
  message: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(SUGGESTION_MIN).max(SUGGESTION_MAX)),
  page: z.preprocess(
    (v) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v.slice(0, PAGE_MAX) : undefined),
    z.string().optional(),
  ),
  website: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
});
