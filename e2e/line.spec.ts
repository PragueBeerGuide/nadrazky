import { expect, test } from "./fixtures";

test("line 210 lists its stops from Praha and its branch", async ({ page }) => {
  await page.goto("/en/line/210");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Praha");
  const stops = await page.locator("ol > li h3").allTextContents();
  expect(stops[0]).toBe("Praha-Braník");
  expect(stops.indexOf("Davle")).toBeGreaterThan(stops.indexOf("Vrané nad Vltavou"));
  await expect(page.getByRole("heading", { name: /^Branch from / })).toBeVisible();
  const badge = page.getByTestId("badge-card");
  await expect(badge.getByRole("heading", { name: "Line 210 badge" })).toBeVisible();
  await expect(badge.getByRole("link", { name: "Log in to collect this badge" })).toBeVisible();
});

test("links to the line on the map", async ({ page }) => {
  await page.goto("/en/line/210");
  await page.getByRole("link", { name: "See line 210 on the map →" }).click();
  await expect(page).toHaveURL(/\/en\/map\?line=210$/);
});
