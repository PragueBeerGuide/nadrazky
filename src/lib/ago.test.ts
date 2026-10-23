import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import cs from "../../messages/cs.json";
import en from "../../messages/en.json";
import { formatAgo, type AgoTranslator } from "./ago";

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
