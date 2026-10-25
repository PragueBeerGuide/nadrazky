import type { Page } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

// The narrowest phones in use (iPhone SE, small Androids) are 320 px wide.
test.use({ viewport: { width: 320, height: 640 } });

/** How far the page sticks out sideways, measured against the screen, not the zoomed-out layout. */
async function overflow(page: Page) {
  const width = page.viewportSize()!.width;
  return page.evaluate((w) => document.documentElement.scrollWidth - w, width);
}

for (const path of ["/cs", "/en"]) {
  test(`the header fits a 320 px phone, signed out (${path})`, async ({ page }) => {
    await page.goto(path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    // The login button is icon-only here but keeps its name for screen readers.
    const login = page.getByRole("banner").getByRole("link", { name: path === "/cs" ? "Přihlásit" : "Log in", exact: true });
    await expect(login).toBeVisible();
  });
}

test("the header fits a 320 px phone, signed in with a long username", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  for (const path of ["/cs", "/en"]) {
    await page.goto(path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  }
});
