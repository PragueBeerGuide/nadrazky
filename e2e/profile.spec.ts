import type { Page } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/** A number on the profile and its label, e.g. stat(page, "pubs") -> "2" and "pubs visited out of 782". */
function stat(page: Page, key: string) {
  const tile = page.getByTestId(`stat-${key}`);
  return { value: tile.locator("dd"), label: tile.locator("dt") };
}

async function checkIn(page: Page, slug: string, ticks: string[] = []) {
  await page.goto(`/en/pub/${slug}/check-in`);
  for (const name of ticks) await page.getByRole("checkbox", { name, exact: true }).check();
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${slug}$`));
}

test("signed out, the profile asks to log in first", async ({ page }) => {
  await page.goto("/en/profile");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fprofile$/);
});

test("a new user's profile is empty and reachable from the account menu", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo);
  await page.getByLabel(`Account: @${user.username}`).click();
  await page.getByRole("link", { name: "Your profile" }).click();
  await expect(page).toHaveURL(/\/en\/profile$/);
  await expect(page.getByRole("heading", { level: 1, name: `@${user.username}` })).toBeVisible();
  await expect(stat(page, "pubs").value).toHaveText("0");
  await expect(page.getByRole("heading", { name: "No check-ins yet" })).toBeVisible();
});

test("counts the pubs, stations and regions a user has checked in at", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  // Two pubs at the same station (Davle, Central Bohemian Region).
  await checkIn(page, "davle-remagen", ["Beer", "Snack"]);
  await checkIn(page, "davle-sk-marina-chyse", ["Beer"]);

  await page.goto("/en/profile");
  await expect(stat(page, "pubs").value).toHaveText("2");
  await expect(stat(page, "pubs").label).toHaveText("pubs visitedout of 782");
  await expect(stat(page, "checkIns").value).toHaveText("2");
  await expect(stat(page, "stations").value).toHaveText("1");
  await expect(stat(page, "stations").label).toHaveText("station");
  await expect(stat(page, "regions").value).toHaveText("1");
  await expect(stat(page, "regions").label).toHaveText("regionout of 14");
  await expect(page.getByText("2 beers", { exact: true })).toBeVisible();
  await expect(page.getByText("1 snack", { exact: true })).toBeVisible();

  const visited = page.getByRole("region", { name: "Pubs you've visited" });
  await expect(visited.getByRole("link")).toHaveCount(2);
  await expect(visited.getByRole("link", { name: /Remagen/ })).toContainText("1 visit");
  const regions = page.getByRole("region", { name: "By region" });
  await expect(regions.getByRole("listitem").first()).toContainText(/Central Bohemian Region\s*2 \/ \d+/);
});

test("the profile is in Czech too", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await checkIn(page, "davle-remagen", ["Beer"]);
  await page.goto("/cs/profil");
  await expect(page.getByRole("main").getByText("Tvůj profil")).toBeVisible();
  await expect(stat(page, "pubs").value).toHaveText("1");
  await expect(stat(page, "pubs").label).toHaveText("navštívená hospodaz celkem 782");
  await expect(page.getByText("1 pivo", { exact: true })).toBeVisible();
});
