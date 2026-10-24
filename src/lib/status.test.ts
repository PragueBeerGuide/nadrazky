import { describe, expect, it } from "vitest";
import { statusFromSource } from "./status";

describe("statusFromSource", () => {
  it("keeps open pubs open", () => {
    expect(statusFromSource("open")).toBe("open");
  });

  it("imports 'maybe open' and anything else as unknown", () => {
    expect(statusFromSource("maybe_open")).toBe("unknown");
    expect(statusFromSource("unknown")).toBe("unknown");
    expect(statusFromSource("")).toBe("unknown");
  });
});
