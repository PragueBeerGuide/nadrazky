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
  await page.goto("/cs/sprava?status=active");
  await expect(page).toHaveURL(/\/cs\/prihlaseni\?next=%2Fcs%2Fsprava%3Fstatus%3Dactive$/);
});

test("the admin dashboard lists users by status and their activity", async ({ page }, testInfo) => {
  const admin = await signUp(page, testInfo, "", "admin");
  await page.getByLabel(`Account: @${admin.username}`).click();
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/admin$/);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 2, name: "Users" })).toBeVisible();

  // Just signed up, with nothing done yet: inactive, not active.
  const users = main.getByRole("table", { name: "Users" });
  await main.getByRole("search", { name: "Users" }).getByLabel("Username, name or email").fill(admin.username);
  await main.getByRole("search", { name: "Users" }).getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/uq=/);
  await expect(users.getByRole("row", { name: new RegExp(`@${admin.username}`) })).toContainText("Inactive");
  await main.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "Active", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`status=active`));
  await expect(main.getByText("No user matches these filters.")).toBeVisible();

  // The sign-up shows in the activity feed, found by the username.
  await main.getByRole("navigation", { name: "What" }).getByRole("link", { name: "Sign-up" }).click();
  await expect(page).toHaveURL(/kind=signup/);
  await main.getByRole("search", { name: "Recent activity" }).getByLabel("User, pub or text").fill(admin.username);
  await main.getByRole("search", { name: "Recent activity" }).getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/[?&]q=/);
  await expect(page).toHaveURL(/kind=signup/);
  await expect(page).toHaveURL(/status=active/);
  await expect(main.getByRole("list", { name: "Recent activity" }).getByRole("listitem")).toHaveCount(1);
  await expect(main.getByRole("list", { name: "Recent activity" })).toContainText(`@${admin.username}`);
});

test("a moderator can't open the admin pages", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "", "moderator");
  expect((await page.goto("/en/admin"))?.status()).toBe(404);
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
