import { describe, expect, it } from "vitest";
import { avatarUrl, hometownSchema } from "./profile";

describe("hometownSchema", () => {
  it("is optional: empty or blank means none", () => {
    expect(hometownSchema.parse("")).toBeNull();
    expect(hometownSchema.parse("   ")).toBeNull();
    expect(hometownSchema.parse(null)).toBeNull();
  });

  it("trims and tidies spaces", () => {
    expect(hometownSchema.parse("  Česká   Třebová ")).toBe("Česká Třebová");
  });

  it("refuses more than 60 characters", () => {
    expect(hometownSchema.safeParse("x".repeat(61)).success).toBe(false);
    expect(hometownSchema.safeParse("x".repeat(60)).success).toBe(true);
  });
});

describe("avatarUrl", () => {
  it("is null without a picture", () => {
    expect(avatarUrl("u1", null)).toBeNull();
  });

  it("changes with every new picture", () => {
    const a = avatarUrl("u1", new Date("2026-10-24T10:00:00Z"));
    const b = avatarUrl("u1", "2026-10-25T10:00:00Z");
    expect(a).toBe(`/api/avatar/u1?v=${Date.parse("2026-10-24T10:00:00Z")}`);
    expect(b).not.toBe(a);
  });
});
