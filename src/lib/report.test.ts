import { describe, expect, it } from "vitest";
import { changeFor, DAILY_REPORT_LIMIT, isAutoApproved, kindsFor, reportLimitApplies, reportLimitReached, reportSchema } from "./report";

const base = { slug: "davle-remagen" };
const errorsOf = (input: Record<string, unknown>) => {
  const r = reportSchema.safeParse({ ...base, ...input });
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("reportSchema", () => {
  it("needs a known kind", () => {
    expect(errorsOf({})).toContain("kind");
    expect(errorsOf({ kind: "moved_to_mars" })).toContain("kind");
  });

  it("accepts closed and reopened without anything else", () => {
    expect(errorsOf({ kind: "closed" })).toEqual([]);
    expect(errorsOf({ kind: "reopened", message: "Open again since September." })).toEqual([]);
  });

  it("needs the new value for name, hours, address and beers", () => {
    for (const kind of ["name", "hours", "address", "beers"]) {
      expect(errorsOf({ kind })).toEqual(["value"]);
      expect(errorsOf({ kind, value: "   " })).toEqual(["value"]);
      expect(errorsOf({ kind, value: "Bufet U Vlaku" })).toEqual([]);
    }
  });

  it("needs a description for a wrong position and for anything else", () => {
    expect(errorsOf({ kind: "location" })).toEqual(["message"]);
    expect(errorsOf({ kind: "other", message: "They serve breakfast now." })).toEqual([]);
  });

  it("trims the texts and drops a value that doesn't belong to the kind", () => {
    expect(reportSchema.parse({ ...base, kind: "name", value: "  Bufet  ", message: " Since May. " })).toMatchObject({
      value: "Bufet",
      message: "Since May.",
    });
    expect(reportSchema.parse({ ...base, kind: "closed", value: "ignored" }).value).toBeUndefined();
  });

  it("limits the length of the texts", () => {
    expect(errorsOf({ kind: "name", value: "x".repeat(201) })).toEqual(["value"]);
    expect(errorsOf({ kind: "other", message: "x".repeat(1001) })).toEqual(["message"]);
  });
});

describe("kindsFor", () => {
  it("offers both 'it's open' and 'closed' for a pub of unknown status", () => {
    expect(kindsFor("unknown")).toEqual(expect.arrayContaining(["reopened", "closed"]));
  });

  it("offers only 'closed' for a pub we list as open", () => {
    expect(kindsFor("open")).toContain("closed");
    expect(kindsFor("open")).not.toContain("reopened");
  });

  it("offers only 'it's open' for a pub we list as closed", () => {
    expect(kindsFor("closed")).toContain("reopened");
    expect(kindsFor("closed")).not.toContain("closed");
  });

  it("always offers the other kinds", () => {
    for (const status of ["open", "unknown", "closed"]) {
      expect(kindsFor(status)).toEqual(expect.arrayContaining(["name", "hours", "address", "beers", "location", "other"]));
    }
  });
});

describe("reportLimitReached", () => {
  it(`allows ${DAILY_REPORT_LIMIT} reports a day`, () => {
    expect(reportLimitReached(0)).toBe(false);
    expect(reportLimitReached(DAILY_REPORT_LIMIT - 1)).toBe(false);
    expect(reportLimitReached(DAILY_REPORT_LIMIT)).toBe(true);
  });
});

describe("isAutoApproved", () => {
  it("approves reports from moderators and admins at once", () => {
    expect(isAutoApproved("moderator")).toBe(true);
    expect(isAutoApproved("admin")).toBe(true);
  });

  it("sends a regular user's report for review", () => {
    expect(isAutoApproved("user")).toBe(false);
  });
});

describe("reportLimitApplies", () => {
  it("limits regular users only", () => {
    expect(reportLimitApplies("user")).toBe(true);
    expect(reportLimitApplies("moderator")).toBe(false);
    expect(reportLimitApplies("admin")).toBe(false);
  });
});

describe("changeFor", () => {
  const now = new Date("2026-10-24T12:00:00Z");

  it("closes and reopens a pub, confirming it this month", () => {
    expect(changeFor("closed", null, now)).toEqual({ status: "closed", closedYear: 2026, lastConfirmedAt: now });
    expect(changeFor("reopened", null, now)).toEqual({ status: "open", closedYear: null, lastConfirmedAt: now });
  });

  it("puts the proposed value into the right field", () => {
    expect(changeFor("name", "Bufet U Vlaku")).toEqual({ name: "Bufet U Vlaku" });
    expect(changeFor("hours", "Mon–Sun 10–22")).toEqual({ openingHours: "Mon–Sun 10–22" });
    expect(changeFor("address", "Nádražní 1, Davle")).toEqual({ address: "Nádražní 1, Davle" });
    expect(changeFor("beers", "Kozel 11°")).toEqual({ beers: "Kozel 11°" });
  });

  it("changes nothing for a position or anything else, which are fixed by hand", () => {
    expect(changeFor("location", null)).toBeNull();
    expect(changeFor("other", null)).toBeNull();
  });

  it("changes nothing when a value is missing", () => {
    expect(changeFor("name", "")).toBeNull();
  });
});
