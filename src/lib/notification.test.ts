import { describe, expect, it } from "vitest";
import { excerpt, notificationHref } from "./notification";

describe("notificationHref", () => {
  it("sends friend requests to the friends page and the rest to moderation", () => {
    expect(notificationHref("friend_request")).toBe("/friends");
    expect(notificationHref("suggestion")).toBe("/moderation");
    expect(notificationHref("report")).toBe("/moderation");
  });
});

describe("excerpt", () => {
  it("keeps a short message as it is, on one line", () => {
    expect(excerpt("  Add\n dark   mode ")).toBe("Add dark mode");
  });

  it("cuts a long message at a word", () => {
    expect(excerpt("Please add a filter for pubs that are open on Sundays", 30)).toBe("Please add a filter for pubs…");
  });

  it("cuts a long word where it must", () => {
    expect(excerpt("x".repeat(40), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
