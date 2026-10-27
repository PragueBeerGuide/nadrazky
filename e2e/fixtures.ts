import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test fails if the page throws or logs an error (hydration mismatches included).
 * Failed requests to the map tile server are ignored, so tests don't depend on its uptime.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" && !/Failed to load resource|openfreemap/i.test(m.text())) errors.push(m.text());
      });
      await use(errors);
      expect(errors, "errors in the browser console").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** A pub that exists in the seed data: three pubs at Davle on line 210. */
export const DAVLE_PUB = "davle-posezeni-u-kotvy";

/** Closes the "new badge" popup that opens on the pub page after a user's first check-in. */
export async function closeBadgePopup(page: Page) {
  const popup = page.getByRole("dialog");
  await popup.getByRole("button", { name: /^(Great|Super)$/ }).click();
  await expect(popup).toBeHidden();
}
