import { DAVLE_PUB, expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto(`/en/pub/${DAVLE_PUB}`);
});

test("shows the station sign, status and line", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Posezení U Kotvy" })).toBeVisible();
  await expect(page.getByText("Davle", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".chip-open").first()).toHaveText("Open");
});

test("check-ins are shown as coming soon", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Check in" })).toBeDisabled();
  await expect(page.getByText("Check-ins are coming soon").first()).toBeVisible();
});

test("the along-line strip marks this station", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Along line 210" })).toBeVisible();
  await expect(page.locator('li[aria-current="location"]')).toContainText("Davle");
});

test("lists the other pubs at the station", async ({ page }) => {
  const others = page.locator("section", { has: page.getByRole("heading", { name: "Other pubs at this station" }) });
  await expect(others.getByRole("link")).toHaveCount(2);
  await others.getByRole("link", { name: /Remagen/ }).click();
  await expect(page).toHaveURL(/\/en\/pub\/davle-remagen$/);
});
