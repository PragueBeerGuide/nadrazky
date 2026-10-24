import { expect, test } from "./fixtures";

test("search works without diacritics", async ({ page }) => {
  await page.goto("/cs/hospody?q=breclav");
  const rows = page.locator("tbody tr:has(td)");
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) await expect(row).toContainText(/Břeclav/i);
});

test("the status filter shows only pubs with that status", async ({ page }) => {
  await page.goto("/en/pubs");
  await page.getByRole("link", { name: /^Open · \d+$/ }).click();
  await expect(page).toHaveURL(/status=open/);
  const chips = page.locator("tbody .chip");
  await expect(chips.first()).toBeVisible();
  await expect(chips).toHaveText(Array((await chips.count())).fill("Open"));
});

test("a pub is open, closed or of unknown status, never 'maybe open'", async ({ page }) => {
  await page.goto("/en/pubs");
  await expect(page.getByRole("link", { name: /^Open · \d+$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Status unknown · \d+$/ })).toBeVisible();
  await expect(page.getByText(/maybe/i)).toHaveCount(0);
  await page.goto("/cs/hospody");
  await expect(page.getByText(/možná/i)).toHaveCount(0);
});

test("the letter bar follows the Czech alphabet", async ({ page }) => {
  await page.goto("/cs/hospody");
  const letters = await page.getByRole("navigation", { name: "Přejít na písmeno" }).getByRole("link").allTextContents();
  expect(letters).toContain("CH");
  expect(letters.indexOf("CH")).toBe(letters.indexOf("H") + 1);
  expect(letters.indexOf("Č")).toBe(letters.indexOf("C") + 1);
  expect(letters).not.toContain("Ú");
  await page.getByRole("link", { name: "CH", exact: true }).click();
  await expect(page).toHaveURL(/#letter-ch$/);
});
