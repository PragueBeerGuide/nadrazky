import { describe, expect, it } from "vitest";
import { DAILY_ANONYMOUS_SUGGESTION_LIMIT, DAILY_SUGGESTION_LIMIT, suggestionLimitReached, suggestionSchema } from "./suggestion";

describe("suggestionSchema", () => {
  it("trims the message and keeps the page path", () => {
    expect(suggestionSchema.parse({ message: "  Add dark mode  ", page: "/map" })).toEqual({ message: "Add dark mode", page: "/map", website: "" });
  });

  it("refuses an empty or too short message", () => {
    expect(suggestionSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(suggestionSchema.safeParse({ message: "hey" }).success).toBe(false);
  });

  it("refuses a message over the limit", () => {
    expect(suggestionSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(false);
  });

  it("drops pages that aren't one of our paths", () => {
    expect(suggestionSchema.parse({ message: "Nice app!", page: "https://evil.example" }).page).toBeUndefined();
    expect(suggestionSchema.parse({ message: "Nice app!", page: "//evil.example" }).page).toBeUndefined();
  });
});

describe("suggestionLimitReached", () => {
  it("gives signed-in users their own limit", () => {
    expect(suggestionLimitReached(DAILY_SUGGESTION_LIMIT - 1, true)).toBe(false);
    expect(suggestionLimitReached(DAILY_SUGGESTION_LIMIT, true)).toBe(true);
  });

  it("shares one limit among signed-out visitors", () => {
    expect(suggestionLimitReached(DAILY_SUGGESTION_LIMIT, false)).toBe(false);
    expect(suggestionLimitReached(DAILY_ANONYMOUS_SUGGESTION_LIMIT, false)).toBe(true);
  });
});
