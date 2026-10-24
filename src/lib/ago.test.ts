import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import cs from "../../messages/cs.json";
import en from "../../messages/en.json";
import { compareLastConfirmed, formatAgo, recentDay, type AgoTranslator } from "./ago";

const translator = (locale: "cs" | "en") =>
  createTranslator({ locale, messages: locale === "cs" ? cs : en, namespace: "ago" }) as AgoTranslator;

describe("formatAgo", () => {
  const t = translator("en");

  it("counts months up to two years", () => {
    expect(formatAgo(t, 0)).toBe("this month");
    expect(formatAgo(t, 1)).toBe("1 month ago");
    expect(formatAgo(t, 23)).toBe("23 months ago");
  });

  it("switches to years from two years", () => {
    expect(formatAgo(t, 24)).toBe("2 years ago");
    expect(formatAgo(t, 59)).toBe("4 years ago");
  });

  it("has a short form for tight columns", () => {
    expect(formatAgo(t, 0, true)).toBe("this mo");
    expect(formatAgo(t, 5, true)).toBe("5 mo");
    expect(formatAgo(t, 48, true)).toBe("4 yr");
  });

  it("says unknown when there is no date", () => {
    expect(formatAgo(t, null)).toBe("unknown");
  });

  it("uses Czech plural forms", () => {
    const tc = translator("cs");
    expect(formatAgo(tc, 1)).toBe("před 1 měsícem");
    expect(formatAgo(tc, 3)).toBe("před 3 měsíci");
    expect(formatAgo(tc, 30)).toBe("před 2 lety");
    expect(formatAgo(tc, 0, true)).toBe("tento měs.");
  });
});

describe("compareLastConfirmed", () => {
  const pub = (name: string, lastConfirmedAt: string | null, monthsAgo: number | null) => ({ name, lastConfirmedAt, monthsAgo });

  it("puts the latest confirmation first, even within the same month", () => {
    const pubs = [
      pub("Bouda", "2026-10-03T10:00:00Z", 0),
      pub("Perón", "2026-10-24T18:00:00Z", 0),
      pub("Nejen Bistro", "2026-10-24T09:30:00Z", 0),
    ];
    expect(pubs.sort(compareLastConfirmed).map((p) => p.name)).toEqual(["Perón", "Nejen Bistro", "Bouda"]);
  });

  it("puts pubs confirmed on the site before those with only nadrazky.eu's months", () => {
    const pubs = [pub("Imported, this month", null, 0), pub("Checked in a year ago", "2025-10-01T12:00:00Z", 12)];
    expect(pubs.sort(compareLastConfirmed).map((p) => p.name)).toEqual(["Checked in a year ago", "Imported, this month"]);
  });

  it("orders the rest by months, unknown last", () => {
    const pubs = [pub("Unknown", null, null), pub("Five", null, 5), pub("Two", null, 2)];
    expect(pubs.sort(compareLastConfirmed).map((p) => p.name)).toEqual(["Two", "Five", "Unknown"]);
  });
});

describe("recentDay", () => {
  // Saturday 24 October 2026, 20:00 in Prague; the week started on Monday the 19th.
  const saturday = new Date("2026-10-24T18:00:00Z");

  it("knows today and yesterday by the Prague calendar day", () => {
    expect(recentDay("2026-10-24T05:00:00Z", saturday)).toBe("today");
    expect(recentDay("2026-10-23T21:30:00Z", saturday)).toBe("yesterday"); // 23:30 Friday in Prague
    expect(recentDay("2026-10-23T22:30:00Z", saturday)).toBe("today"); // 00:30 Saturday in Prague
  });

  it("calls the days since Monday this week", () => {
    expect(recentDay("2026-10-21T12:00:00Z", saturday)).toBe("thisWeek");
    expect(recentDay("2026-10-19T08:00:00Z", saturday)).toBe("thisWeek");
    expect(recentDay("2026-10-18T20:00:00Z", saturday)).toBeNull(); // Sunday 22:00, last week
  });

  it("on a Monday, only yesterday is recent", () => {
    const monday = new Date("2026-10-26T08:00:00Z");
    expect(recentDay("2026-10-25T12:00:00Z", monday)).toBe("yesterday");
    expect(recentDay("2026-10-24T12:00:00Z", monday)).toBeNull();
  });

  it("treats a moment slightly in the future as today", () => {
    expect(recentDay("2026-10-24T18:00:05Z", saturday)).toBe("today");
  });
});

describe("formatAgo with a date", () => {
  const now = new Date("2026-10-24T18:00:00Z");

  it("says today, yesterday and this week in both languages", () => {
    expect(formatAgo(translator("en"), 0, false, "2026-10-24T08:00:00Z", now)).toBe("today");
    expect(formatAgo(translator("cs"), 0, false, "2026-10-24T08:00:00Z", now)).toBe("dnes");
    expect(formatAgo(translator("cs"), 0, false, "2026-10-23T08:00:00Z", now)).toBe("včera");
    expect(formatAgo(translator("cs"), 0, false, "2026-10-20T08:00:00Z", now)).toBe("tento týden");
    expect(formatAgo(translator("en"), 0, true, "2026-10-20T08:00:00Z", now)).toBe("this wk");
  });

  it("falls back to months for older dates and when there is no date", () => {
    expect(formatAgo(translator("en"), 0, false, "2026-10-05T08:00:00Z", now)).toBe("this month");
    expect(formatAgo(translator("cs"), 3, false, "2026-07-01T08:00:00Z", now)).toBe("před 3 měsíci");
    expect(formatAgo(translator("en"), 30, false, null, now)).toBe("2 years ago");
  });
});
