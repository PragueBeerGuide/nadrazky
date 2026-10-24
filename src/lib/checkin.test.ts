import { describe, expect, it } from "vitest";
import { alreadyCheckedIn, checkInDay, checkInSchema, CHECKIN_RADIUS_M, distanceMeters, isWithinRadius, judgeCheckIn } from "./checkin";

// Davle station, where three pubs share the station's point.
const davle = { lat: 49.887599, lon: 14.398494 };

/** A point `metres` north of `p` (one degree of latitude is about 111.2 km). */
const north = (p: typeof davle, metres: number) => ({ lat: p.lat + metres / 111_195, lon: p.lon });

describe("distanceMeters", () => {
  it("is zero at the same point", () => {
    expect(distanceMeters(davle, davle)).toBe(0);
  });

  it("measures short distances to the metre", () => {
    expect(distanceMeters(davle, north(davle, 250))).toBeCloseTo(250, 0);
  });

  it("measures a known distance: Praha hl. n. to Brno hl. n. is about 185 km", () => {
    const praha = { lat: 50.0833, lon: 14.4353 };
    const brno = { lat: 49.1906, lon: 16.6129 };
    expect(distanceMeters(praha, brno) / 1000).toBeGreaterThan(183);
    expect(distanceMeters(praha, brno) / 1000).toBeLessThan(187);
  });
});

describe("isWithinRadius", () => {
  it(`accepts up to ${CHECKIN_RADIUS_M} m and refuses beyond`, () => {
    expect(isWithinRadius(north(davle, 0), davle)).toBe(true);
    expect(isWithinRadius(north(davle, 290), davle)).toBe(true);
    expect(isWithinRadius(north(davle, 310), davle)).toBe(false);
    expect(isWithinRadius(north(davle, 5000), davle)).toBe(false);
  });
});

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

describe("judgeCheckIn", () => {
  const now = new Date("2026-10-24T15:00:00Z");

  it("accepts a check-in on the spot", () => {
    expect(judgeCheckIn(north(davle, 40), davle, [], now)).toEqual({ ok: true, distance: 40 });
  });

  it("refuses a check-in from too far away", () => {
    expect(judgeCheckIn(north(davle, 1200), davle, [], now)).toMatchObject({ ok: false, reason: "tooFar", distance: 1200 });
  });

  it("refuses a second check-in the same day even on the spot", () => {
    expect(judgeCheckIn(davle, davle, [new Date("2026-10-24T09:00:00Z")], now)).toMatchObject({ ok: false, reason: "alreadyToday" });
  });
});

describe("checkInSchema", () => {
  const base = { slug: "davle-remagen", lat: "49.8876", lon: "14.3985", pubWasOpen: "open" };

  it("needs a position and whether the pub was open", () => {
    expect(checkInSchema.safeParse({ ...base, lat: "" }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, lon: undefined }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, pubWasOpen: undefined }).success).toBe(false);
  });

  it("reads ticks, rating and note, all optional", () => {
    const plain = checkInSchema.parse(base);
    expect(plain).toMatchObject({ hadBeer: false, hadSnack: false, pubWasOpen: true });
    expect(plain.rating).toBeUndefined();
    expect(plain.note).toBeUndefined();
    expect(
      checkInSchema.parse({ ...base, hadBeer: "on", hadSnack: "on", rating: "4", note: "  Pivo dobré.  ", pubWasOpen: "closed" }),
    ).toMatchObject({ hadBeer: true, hadShot: false, hadSnack: true, rating: 4, note: "Pivo dobré.", pubWasOpen: false });
  });

  it("refuses a rating outside 1–5 and a note over 280 characters", () => {
    expect(checkInSchema.safeParse({ ...base, rating: "6" }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, note: "x".repeat(281) }).success).toBe(false);
  });
});
