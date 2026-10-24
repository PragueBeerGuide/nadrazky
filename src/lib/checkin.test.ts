import { describe, expect, it } from "vitest";
import { alreadyCheckedIn, checkInDay, checkInSchema, pubChangeAfterCheckIn } from "./checkin";

describe("checkInDay", () => {
  it("uses the Prague calendar day, not UTC", () => {
    // 23:30 UTC on 24 October is already 01:30 on 25 October in Prague (summer time).
    expect(checkInDay(new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
    // In winter Prague is UTC+1: 22:59 UTC is 23:59 the same day.
    expect(checkInDay(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
    expect(checkInDay(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
  });
});

describe("once per pub per day", () => {
  const evening = new Date("2026-10-24T19:00:00Z"); // 21:00 in Prague

  it("counts the first check-in of the day", () => {
    expect(alreadyCheckedIn([], evening)).toBe(false);
    expect(alreadyCheckedIn([new Date("2026-10-23T19:00:00Z")], evening)).toBe(false);
  });

  it("refuses a second one the same Prague day", () => {
    expect(alreadyCheckedIn([new Date("2026-10-24T06:00:00Z")], evening)).toBe(true);
  });

  it("allows one again after midnight in Prague", () => {
    // 22:30 UTC on 24 October is 00:30 on the 25th in Prague.
    expect(alreadyCheckedIn([evening], new Date("2026-10-24T22:30:00Z"))).toBe(false);
  });
});

describe("checkInSchema", () => {
  const base = { slug: "davle-remagen", pubWasOpen: "open" };

  it("needs the pub and whether it was open", () => {
    expect(checkInSchema.safeParse({ ...base, slug: "" }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, pubWasOpen: undefined }).success).toBe(false);
  });

  it("reads the details, all optional", () => {
    const plain = checkInSchema.parse(base);
    expect(plain).toMatchObject({ beers: 0, shots: 0, hadNonAlcoholic: false, hadFood: false, pubWasOpen: true });
    expect(plain.rating).toBeUndefined();
    expect(plain.note).toBeUndefined();
    expect(
      checkInSchema.parse({ ...base, hadBeer: "on", beerCount: "3", hadFood: "on", rating: "4", note: "  Pivo dobré.  ", pubWasOpen: "closed" }),
    ).toMatchObject({ beers: 3, shots: 0, hadFood: true, rating: 4, note: "Pivo dobré.", pubWasOpen: false });
  });

  it("needs an amount, 1 to 10, for beer and shots", () => {
    const issues = (input: Record<string, string>) => {
      const r = checkInSchema.safeParse({ ...base, ...input });
      return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    };
    expect(issues({ hadBeer: "on" })).toEqual(["beerCount"]);
    expect(issues({ hadShot: "on", shotCount: "" })).toEqual(["shotCount"]);
    expect(issues({ hadBeer: "on", beerCount: "11" })).toEqual(["beerCount"]);
    expect(issues({ hadBeer: "on", beerCount: "0" })).toContain("beerCount");
    expect(checkInSchema.parse({ ...base, hadBeer: "on", beerCount: "10", hadShot: "on", shotCount: "2" })).toMatchObject({ beers: 10, shots: 2 });
  });

  it("ignores an amount for a drink that isn't ticked", () => {
    expect(checkInSchema.parse({ ...base, beerCount: "4" })).toMatchObject({ beers: 0 });
  });

  it("ignores a position if one is posted", () => {
    expect(checkInSchema.parse({ ...base, lat: "50.08", lon: "14.43", accuracy: "20" })).not.toHaveProperty("lat");
  });

  it("refuses a rating outside 1–5 and a note over 280 characters", () => {
    expect(checkInSchema.safeParse({ ...base, rating: "6" }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, note: "x".repeat(281) }).success).toBe(false);
  });
});

describe("pubChangeAfterCheckIn", () => {
  const now = new Date("2026-10-24T18:00:00Z");

  it("marks the pub open and confirmed now when it was open", () => {
    expect(pubChangeAfterCheckIn(true, now)).toEqual({ lastConfirmedAt: now, updatedAt: now, status: "open", closedYear: null });
  });

  it("only confirms the pub now when it was closed, without changing its status", () => {
    const change = pubChangeAfterCheckIn(false, now);
    expect(change).toEqual({ lastConfirmedAt: now, updatedAt: now });
    expect(change).not.toHaveProperty("status");
  });
});
