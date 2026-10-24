import { describe, expect, it } from "vitest";
import { DAILY_REPORT_LIMIT, kindsFor, reportLimitReached, reportSchema } from "./report";

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
  it("offers 'closed' for a pub we list as open or unknown, 'reopened' for a closed one", () => {
    expect(kindsFor("open")).toContain("closed");
    expect(kindsFor("open")).not.toContain("reopened");
    expect(kindsFor("unknown")).toContain("closed");
    expect(kindsFor("closed")).toContain("reopened");
    expect(kindsFor("closed")).not.toContain("closed");
  });
});

describe("reportLimitReached", () => {
  it(`allows ${DAILY_REPORT_LIMIT} reports a day`, () => {
    expect(reportLimitReached(0)).toBe(false);
    expect(reportLimitReached(DAILY_REPORT_LIMIT - 1)).toBe(false);
    expect(reportLimitReached(DAILY_REPORT_LIMIT)).toBe(true);
  });
});
