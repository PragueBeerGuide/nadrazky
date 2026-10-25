/**
 * Pub statuses. Check-ins and reports only ever set "open" or "closed"; every other pub is
 * "unknown". nadrazky.eu's "maybe open" (v provozu?) counts as unknown here.
 */
export const PUB_STATUSES = ["open", "unknown", "closed"] as const;
export type PubStatus = (typeof PUB_STATUSES)[number];

/** The status a pub gets from the nadrazky.eu data on import. */
export function statusFromSource(status: string): PubStatus {
  return status === "open" ? "open" : "unknown";
}
