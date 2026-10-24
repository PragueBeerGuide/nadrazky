import { expect, test } from "./fixtures";

test("the footer links to the privacy page, which names who to contact", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "lukas@nadrazky.com" }).first()).toHaveAttribute("href", "mailto:lukas@nadrazky.com");
  await expect(page.getByText("We never store your position.")).toBeVisible();
});

test("the privacy page is in Czech too", async ({ page }) => {
  await page.goto("/cs/ochrana-soukromi");
  await expect(page.getByRole("heading", { level: 1, name: "Ochrana soukromí" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ve zkratce" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
});

test("the login page links to the privacy page", async ({ page }) => {
  await page.goto("/en/login");
  await page.getByRole("main").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
});
