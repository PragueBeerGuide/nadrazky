import { describe, expect, it } from "vitest";
import { badgeKey, badgeProgress, badgeThresholds, earnedLevels, parseBadgeKey, shownLevels } from "./badges";

describe("badgeThresholds", () => {
  it("starts at the first pub, then every 5, and ends with every pub", () => {
    expect(badgeThresholds(12, 5)).toEqual([1, 5, 10, 12]);
    expect(badgeThresholds(133, 5)).toHaveLength(28);
  });

  it("doesn't add a step level on top of the last one", () => {
    expect(badgeThresholds(10, 5)).toEqual([1, 5, 10]);
    expect(badgeThresholds(6, 5)).toEqual([1, 5, 6]);
  });

  it("gives a short line only its first and last level", () => {
    expect(badgeThresholds(3, 5)).toEqual([1, 3]);
    expect(badgeThresholds(1, 5)).toEqual([1]);
  });

  it("has no levels where there are no pubs", () => {
    expect(badgeThresholds(0, 5)).toEqual([]);
  });

  it("steps by 10 for Nádražák", () => {
    expect(badgeThresholds(35, 10)).toEqual([1, 10, 20, 30, 35]);
  });
});

describe("badgeProgress", () => {
  it("has no level before the first pub", () => {
    expect(badgeProgress(0, 12, 5)).toMatchObject({ level: 0, levels: 4, complete: false, nextAt: 1 });
  });

  it("raises a level every 5 different pubs", () => {
    expect(badgeProgress(1, 12, 5)).toMatchObject({ level: 1, nextAt: 5 });
    expect(badgeProgress(4, 12, 5)).toMatchObject({ level: 1, nextAt: 5 });
    expect(badgeProgress(5, 12, 5)).toMatchObject({ level: 2, nextAt: 10 });
    expect(badgeProgress(11, 12, 5)).toMatchObject({ level: 3, nextAt: 12 });
  });

  it("measures the way from one level to the next", () => {
    expect(badgeProgress(0, 12, 5).toNext).toBe(0);
    expect(badgeProgress(3, 12, 5).toNext).toBe(0.5);
    expect(badgeProgress(7, 12, 5).toNext).toBe(0.4);
    expect(badgeProgress(12, 12, 5).toNext).toBe(1);
  });

  it("completes at every pub", () => {
    expect(badgeProgress(12, 12, 5)).toMatchObject({ level: 4, complete: true, nextAt: null });
    expect(badgeProgress(1, 1, 5)).toMatchObject({ level: 1, levels: 1, complete: true });
  });

  it("is never complete without pubs", () => {
    expect(badgeProgress(0, 0, 5)).toMatchObject({ level: 0, complete: false, nextAt: null });
  });
});

describe("earnedLevels", () => {
  const visits = Array.from({ length: 6 }, (_, i) => ({ checkinId: 100 + i, at: new Date(Date.UTC(2026, 9, i + 1)) }));

  it("credits each level to the check-in at the pub that reached it", () => {
    expect(earnedLevels(visits, 12, 5)).toEqual([
      { level: 1, complete: false, checkinId: 100, earnedAt: visits[0].at },
      { level: 2, complete: false, checkinId: 104, earnedAt: visits[4].at },
    ]);
  });

  it("marks the last level complete", () => {
    expect(earnedLevels(visits.slice(0, 3), 3, 5)).toEqual([
      { level: 1, complete: false, checkinId: 100, earnedAt: visits[0].at },
      { level: 2, complete: true, checkinId: 102, earnedAt: visits[2].at },
    ]);
  });

  it("earns nothing without visits", () => {
    expect(earnedLevels([], 12, 5)).toEqual([]);
  });
});

describe("badge keys", () => {
  it("round-trips lines, regions and Nádražák", () => {
    expect(badgeKey("line", "010")).toBe("line:010");
    expect(parseBadgeKey("line:010")).toEqual({ kind: "line", id: "010" });
    expect(parseBadgeKey(badgeKey("region", "praha"))).toEqual({ kind: "region", id: "praha" });
    expect(parseBadgeKey(badgeKey("pubs"))).toEqual({ kind: "pubs", id: "" });
  });

  it("rejects anything else", () => {
    expect(parseBadgeKey("station:davle")).toBeNull();
    expect(parseBadgeKey("line:")).toBeNull();
  });
});

describe("shownLevels", () => {
  it("lists every level of a short badge", () => {
    expect(shownLevels(4, 0)).toEqual([1, 2, 3, 4]);
    expect(shownLevels(7, 0)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shows the first five, a gap and the last", () => {
    expect(shownLevels(80, 0)).toEqual([1, 2, 3, 4, 5, { gap: 74 }, 80]);
    expect(shownLevels(80, 3)).toEqual([1, 2, 3, 4, 5, { gap: 74 }, 80]);
  });

  it("keeps the level reached and the next one in view", () => {
    expect(shownLevels(80, 30)).toEqual([1, 2, 3, 4, 5, { gap: 24 }, 30, 31, { gap: 48 }, 80]);
    expect(shownLevels(80, 79)).toEqual([1, 2, 3, 4, 5, { gap: 73 }, 79, 80]);
  });
});
