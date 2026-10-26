import { describe, expect, it } from "vitest";
import { lineOption, lineStationsSchema, parseLineNumbers, stationLinesSchema } from "./railLinks";

describe("parseLineNumbers", () => {
  it("reads a picked option back to its number", () => {
    expect(parseLineNumbers(lineOption({ number: "010", name: "Kolín – Česká Třebová" }))).toEqual(["010"]);
  });

  it("doesn't take digits from a picked option's name", () => {
    expect(parseLineNumbers("321 · Opava východ – Ostrava 2")).toEqual(["321"]);
  });

  it("takes several numbers at once, padded and without repeats", () => {
    expect(parseLineNumbers("010, 11 230;10")).toEqual(["010", "011", "230"]);
  });

  it("ignores numbers longer than three digits and text", () => {
    expect(parseLineNumbers("1234 abc")).toEqual([]);
  });
});

describe("stationLinesSchema", () => {
  it("accepts adding lines and removing one", () => {
    expect(stationLinesSchema.safeParse({ op: "add", stationId: "4", lines: "010" }).success).toBe(true);
    expect(stationLinesSchema.safeParse({ op: "remove", stationId: "4", line: "010" }).success).toBe(true);
  });

  it("refuses an empty add, a bad station id or a bad line number", () => {
    expect(stationLinesSchema.safeParse({ op: "add", stationId: "4", lines: "  " }).success).toBe(false);
    expect(stationLinesSchema.safeParse({ op: "add", stationId: "x", lines: "010" }).success).toBe(false);
    expect(stationLinesSchema.safeParse({ op: "remove", stationId: "4", line: "10" }).success).toBe(false);
  });
});

describe("lineStationsSchema", () => {
  it("accepts adding a station by name and removing one by id", () => {
    expect(lineStationsSchema.safeParse({ op: "add", line: "010", station: "Pardubice hl.n." }).success).toBe(true);
    expect(lineStationsSchema.safeParse({ op: "remove", line: "010", stationId: "7" }).success).toBe(true);
  });

  it("refuses an unknown operation", () => {
    expect(lineStationsSchema.safeParse({ op: "move", line: "010", stationId: "7" }).success).toBe(false);
  });
});
