import { describe, expect, it } from "vitest";
import { canDecideSuggestions, canDeletePubs, canEditRailData, canModerate } from "./roles";

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

describe("canEditRailData", () => {
  it("lets only admins edit stations and lines", () => {
    expect(canEditRailData("admin")).toBe(true);
    expect(canEditRailData("moderator")).toBe(false);
    expect(canEditRailData("user")).toBe(false);
    expect(canEditRailData(null)).toBe(false);
  });
});

describe("canDecideSuggestions", () => {
  it("lets only admins approve or decline suggestions", () => {
    expect(canDecideSuggestions("admin")).toBe(true);
    expect(canDecideSuggestions("moderator")).toBe(false);
    expect(canDecideSuggestions("user")).toBe(false);
    expect(canDecideSuggestions(null)).toBe(false);
  });
});

describe("canDeletePubs", () => {
  it("lets moderators and admins delete pubs", () => {
    expect(canDeletePubs("admin")).toBe(true);
    expect(canDeletePubs("moderator")).toBe(true);
    expect(canDeletePubs("user")).toBe(false);
    expect(canDeletePubs(null)).toBe(false);
  });
});
