import { DAVLE_PUB, expect, test } from "./fixtures";

test.describe("on a computer", () => {
  test.skip(({ isMobile }) => isMobile, "the side panel is for wider screens");

  test("filters by line, search and status", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    const panel = page.getByRole("complementary", { name: "Filters and results" });
    const rows = panel.getByRole("listitem");
    const all = await rows.count();

    await panel.getByLabel("Rail line").selectOption("210");
    await expect(panel.getByText(/\d+ pubs on line 210/)).toBeVisible();
    const onLine = await rows.count();
    expect(onLine).toBeLessThan(all);

    await panel.getByRole("button", { name: /^Open/ }).click();
    await expect(panel.getByRole("button", { name: /^Open/ })).toHaveAttribute("aria-pressed", "false");
    expect(await rows.count()).toBeLessThan(onLine);

    await panel.getByLabel("Search a station or pub").fill("davle");
    await expect(panel.getByText("No pubs match", { exact: false })).toBeVisible();
  });

  test("opens a popup for a pub's station", async ({ page }) => {
    await page.goto(`/en/map?pub=${DAVLE_PUB}`);
    const popup = page.locator(".maplibregl-popup");
    await expect(popup).toBeVisible({ timeout: 15_000 });
    await expect(popup).toContainText("Davle");
    await expect(popup).toContainText(/3 pubs at this station/);
    await popup.getByRole("link", { name: "Pub details" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/pub/${DAVLE_PUB}$`));
  });
});

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the bottom sheet is for phones");

  test("shows the selected station as a bottom sheet", async ({ page }) => {
    await page.goto(`/cs/mapa?pub=${DAVLE_PUB}`);
    await expect(page.getByText(/3 nádražky na stanici/)).toBeVisible();
    await page.getByRole("button", { name: "Zavřít" }).click();
    await expect(page.getByText(/3 nádražky na stanici/)).toBeHidden();
  });
});
