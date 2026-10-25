import { describe, expect, it } from "vitest";
import { canModerate } from "./roles";

describe("canModerate", () => {
  it("lets moderators and admins review reports", () => {
    expect(canModerate("moderator")).toBe(true);
    expect(canModerate("admin")).toBe(true);
  });

  it("doesn't let regular users or visitors", () => {
    expect(canModerate("user")).toBe(false);
    expect(canModerate(null)).toBe(false);
    expect(canModerate(undefined)).toBe(false);
  });
});
