/**
 * Badges level up as a user visits more different pubs, the way Untappd's badges do:
 *
 * - Nádražák ("pubs"): every pub in the country; level 1 at the first pub, then a level every 10.
 * - A line ("line:<number>") or a region ("region:<slug>"): level 1 at the first pub there,
 *   then a level every 5, and a last level for visiting every pub that isn't closed.
 *
 * Only different pubs count; a second visit to the same pub raises nothing. Earned levels
 * are kept (user_badges) even when pubs are added later, so this works out what has been
 * reached now and the caller saves what is new.
 */

export type BadgeKind = "pubs" | "line" | "region";
export type BadgeKey = "pubs" | `line:${string}` | `region:${string}`;

/** Pubs between levels after level 1. */
export const BADGE_STEP: Record<BadgeKind, number> = { pubs: 10, line: 5, region: 5 };

export function badgeKey(kind: BadgeKind, id?: string): BadgeKey {
  return kind === "pubs" ? "pubs" : `${kind}:${id}`;
}

export function parseBadgeKey(key: string): { kind: BadgeKind; id: string } | null {
  if (key === "pubs") return { kind: "pubs", id: "" };
  const [kind, id] = key.split(":", 2);
  return (kind === "line" || kind === "region") && id ? { kind, id } : null;
}

/**
 * How many different pubs each level needs: 1, then every `step`, and last `total`
 * (every pub there), which is the level that completes the badge. A level that would
 * fall on `total` or past it is left out, so a line of 3 pubs has two levels: 1 and 3.
 */
export function badgeThresholds(total: number, step: number) {
  if (total < 1) return [];
  const levels = [1];
  for (let n = step; n < total; n += step) levels.push(n);
  if (total > 1) levels.push(total);
  return levels;
}

export type BadgeProgress = {
  /** The level reached, 0 for none yet. */
  level: number;
  /** All levels, the last one completing the badge. */
  levels: number;
  complete: boolean;
  visited: number;
  total: number;
  /** Different pubs the next level needs, null once complete. */
  nextAt: number | null;
  /** How far from the level reached to the next one, 0–1; 1 once complete. */
  toNext: number;
};

/** Where a user stands on one badge with `visited` of its `total` pubs. */
export function badgeProgress(visited: number, total: number, step: number): BadgeProgress {
  const thresholds = badgeThresholds(total, step);
  const level = thresholds.filter((n) => n <= visited).length;
  const complete = thresholds.length > 0 && level === thresholds.length;
  const nextAt = complete ? null : (thresholds[level] ?? null);
  const from = level ? thresholds[level - 1] : 0;
  const toNext = nextAt === null ? 1 : (visited - from) / (nextAt - from);
  return { level, levels: thresholds.length, complete, visited, total, nextAt, toNext };
}

export type BadgeVisit = { checkinId: number; at: Date };

export type EarnedLevel = { level: number; complete: boolean; checkinId: number; earnedAt: Date };

/**
 * The levels reached on one badge, each with the check-in that reached it. `visits` are the
 * user's first check-ins at each different pub of the badge, oldest first; the n-th of them
 * reaches the level that needs n pubs.
 */
export function earnedLevels(visits: BadgeVisit[], total: number, step: number): EarnedLevel[] {
  const thresholds = badgeThresholds(total, step);
  const earned: EarnedLevel[] = [];
  thresholds.forEach((n, i) => {
    const visit = visits[n - 1];
    if (visit) earned.push({ level: i + 1, complete: i === thresholds.length - 1, checkinId: visit.checkinId, earnedAt: visit.at });
  });
  return earned;
}

/** A run of levels left out of a shortened list, by how many. */
export type LevelGap = { gap: number };

/**
 * The levels to list on a badge's page when there are many: the first five, the level the
 * user has reached and the next one, and the last; each run left out becomes a gap.
 */
export function shownLevels(levels: number, reached: number, first = 5): (number | LevelGap)[] {
  const keep = new Set<number>();
  for (let l = 1; l <= Math.min(first, levels); l++) keep.add(l);
  for (const l of [reached, reached + 1, levels]) if (l >= 1 && l <= levels) keep.add(l);
  const shown: (number | LevelGap)[] = [];
  let previous = 0;
  for (const l of [...keep].sort((a, b) => a - b)) {
    // A gap of one level is shown as the level itself.
    if (l - previous === 2) shown.push(previous + 1);
    else if (l - previous > 2) shown.push({ gap: l - previous - 1 });
    shown.push(l);
    previous = l;
  }
  return shown;
}
