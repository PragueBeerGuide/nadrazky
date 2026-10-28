import { expect, test } from "./fixtures";

test("the language switch keeps you on the same page", async ({ page }) => {
  await page.goto("/cs/hospody");
  await expect(page.getByRole("heading", { level: 1, name: "Nádražky" })).toBeVisible();
  await page.getByRole("button", { name: "Jazyk: Čeština" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/pubs$/);
  await expect(page.getByRole("heading", { level: 1, name: "Station pubs" })).toBeVisible();
  await page.getByRole("button", { name: "Language: English" }).click();
  await expect(page.getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "true");
});

test("the current section is marked in the navigation", async ({ page }, { project }) => {
  await page.goto("/en/line/210");
  const nav = project.name === "phone" ? page.getByRole("navigation", { name: "Sections" }) : page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Lines" })).toHaveAttribute("aria-current", "page");
});

test("home page search goes to the pub list", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("searchbox", { name: "Search a station or pub" }).fill("davle");
  await page.getByRole("searchbox", { name: "Search a station or pub" }).press("Enter");
  await expect(page).toHaveURL(/\/en\/pubs\?q=davle/);
  await expect(page.getByRole("link", { name: "Posezení U Kotvy" })).toBeVisible();
});
