import type { TestInfo } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/**
 * Each test links its own station and line, and the desktop and phone runs (which go
 * in parallel) use a different pair each. The lines start without any station.
 */
const STATION_PAIRS = [
  { slug: "prelouc", line: "015", name: "Přelouč – Prachovice" },
  { slug: "chrudim", line: "016", name: "Borohrádek – Chrudim" },
] as const;
const LINE_PAIRS = [
  { station: "Pečky", line: "012" },
  { station: "Přelouč", line: "010" },
] as const;
const pairFor = <T extends readonly unknown[]>(pairs: T, info: TestInfo): T[number] => pairs[info.project.name === "phone" ? 1 : 0];

test("signed out, the admin pages ask to log in", async ({ page }) => {
  await page.goto("/en/admin/lines");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fadmin%2Flines$/);
});

test("a moderator can't open the admin pages", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "", "moderator");
  expect((await page.goto("/en/admin/lines"))?.status()).toBe(404);
  expect((await page.goto("/en/admin/station/prelouc"))?.status()).toBe(404);
});

test("an admin adds lines to a station and removes one", async ({ page }, testInfo) => {
  const { slug, line, name } = pairFor(STATION_PAIRS, testInfo);
  await signUp(page, testInfo, `/en/admin/station/${slug}`, "admin");
  const main = page.getByRole("main");
  await main.getByLabel("Add lines").fill(line);
  await main.getByRole("button", { name: "Add", exact: true }).click();
  await expect(main.getByRole("status")).toHaveText(`Added: ${line}`);
  await expect(main.getByRole("link", { name })).toBeVisible();

  // The line has a station now, so it's no longer listed among the lines without one.
  await page.goto("/en/admin/lines?empty=1");
  await expect(page.getByRole("main").getByRole("link", { name })).toHaveCount(0);

  await page.goto(`/en/admin/station/${slug}`);
  await main.getByRole("button", { name: `Remove ${line} ${name}` }).click();
  await expect(main.getByRole("status")).toHaveText("Removed.");
  await expect(main.getByRole("link", { name })).toHaveCount(0);
});

test("an admin adds a station to a line, and the public line page lists it", async ({ page }, testInfo) => {
  const { station, line } = pairFor(LINE_PAIRS, testInfo);
  await signUp(page, testInfo, `/en/admin/line/${line}`, "admin");
  const main = page.getByRole("main");
  await main.getByLabel("Add a station").fill(station);
  await main.getByRole("button", { name: "Add", exact: true }).click();
  await expect(main.getByRole("status")).toHaveText(`Added: ${station}`);
  await expect(main.getByRole("link", { name: station, exact: true })).toBeVisible();

  await page.goto(`/en/line/${line}`);
  await expect(page.getByRole("heading", { level: 3, name: station })).toBeVisible();
  await page.getByRole("link", { name: "Edit stations" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/admin/line/${line}$`));
});

test("an unknown line number is reported, not added", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/admin/station/pecky", "admin");
  const main = page.getByRole("main");
  await main.getByLabel("Add lines").fill("999");
  await main.getByRole("button", { name: "Add", exact: true }).click();
  await expect(main.getByRole("status")).toHaveText("Not found: 999");
});
