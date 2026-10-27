import { signUp } from "./auth";
import { DAVLE_PUB, expect, test } from "./fixtures";

test("signed out, the badges page lists every badge, all locked", async ({ page }) => {
  await page.goto("/en/badges");
  await expect(page.getByRole("heading", { level: 1, name: "Badges" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  const lines = page.getByRole("region", { name: "Rail lines" });
  await expect(lines.getByRole("img", { name: "Line 210: Not started" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Regions" }).getByRole("listitem")).toHaveCount(14);
});

test("an unknown badge is a 404", async ({ page }) => {
  expect((await page.goto("/en/badges/line/nope"))?.status()).toBe(404);
});

test("the first check-in earns level 1 badges and shows them once", async ({ page }, testInfo) => {
  await signUp(page, testInfo, `/en/pub/${DAVLE_PUB}/check-in`);
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${DAVLE_PUB}$`));

  const popup = page.getByRole("dialog");
  await expect(popup.getByRole("heading", { name: /new badges$/ })).toBeVisible();
  await expect(popup.getByRole("link", { name: /^Nádražák: Level 1/ })).toBeVisible();
  await expect(popup.getByRole("link", { name: /^Line 210: Level 1/ })).toBeVisible();
  await expect(popup.getByRole("link", { name: /^Central Bohemian Region: Level 1/ })).toBeVisible();
  await popup.getByRole("button", { name: "Great" }).click();
  await expect(popup).toBeHidden();

  // Seen once, it doesn't come back.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/en/badges/line/210");
  await expect(page.getByTestId("badge-state")).toHaveText(/^Level 1 of \d+$/);
  await expect(page.getByTestId("badge-progress")).toHaveText(/^1 of \d+ pubs$/);
  await expect(page.getByRole("region", { name: "Levels" }).getByRole("link", { name: /^at / })).toBeVisible();
  // The pub is visited, so it isn't in the list of pubs still to visit.
  await expect(page.getByRole("region", { name: "Still to visit" }).getByRole("link", { name: /Posezení U Kotvy/ })).toHaveCount(0);

  await page.goto("/en/line/210");
  await expect(page.getByTestId("badge-card")).toContainText("Level 1 of");
  await expect(page.getByRole("link", { name: /Posezení U Kotvy/ })).toContainText("Visited");

  await page.goto("/en/profile");
  await expect(page.getByRole("region", { name: /^Badges/ }).getByRole("img", { name: "Line 210: Level 1" })).toBeVisible();
});
