import type { TestInfo } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/**
 * Deleting hides a pub for good, so the deleting test uses a pub no other test needs,
 * and the desktop and phone runs (which go in parallel) a different one each.
 */
const PUBS = [
  { slug: "zruc-nad-sazavou-obcerstveni-u-nadrazi", name: "Občerstvení u nádraží" },
  { slug: "zdar-nad-sazavou-kebab-house", name: "Kebab House" },
] as const;
const pubFor = (info: TestInfo) => PUBS[info.project.name === "phone" ? 1 : 0];

test("regular users don't get the delete button", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/pub/davle-posezeni-u-kotvy");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete pub" })).toHaveCount(0);
});

test("a moderator deletes a pub and it disappears everywhere", async ({ page }, testInfo) => {
  const pub = pubFor(testInfo);
  const search = `/en/pubs?q=${encodeURIComponent(pub.name)}`;
  await signUp(page, testInfo, search, "moderator");
  await page.getByRole("link", { name: pub.name, exact: true }).click();

  // Cancelling keeps it.
  await page.getByRole("button", { name: "Delete pub" }).click();
  const dialog = page.getByRole("alertdialog", { name: `Delete ${pub.name}?` });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Delete pub" }).click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/pubs$/);
  await expect(page.getByText(`${pub.name} is deleted.`)).toBeVisible();

  const response = await page.goto(`/en/pub/${pub.slug}`);
  expect(response?.status()).toBe(404);
  await page.goto(search);
  await expect(page.getByRole("link", { name: pub.name, exact: true })).toHaveCount(0);
});

const LIST_PUBS = [
  { slug: "znojmo-pizzeria-cirkus", name: "Pizzeria Cirkus" },
  { slug: "zlin-prstne-restaurace-u-kajmana", name: "Restaurace U Kajmana" },
] as const;

test("a moderator deletes a pub from the pub list", async ({ page }, testInfo) => {
  const pub = LIST_PUBS[testInfo.project.name === "phone" ? 1 : 0];
  const search = `/en/pubs?q=${encodeURIComponent(pub.name)}`;
  await signUp(page, testInfo, search, "moderator");
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: pub.name, exact: true }) });
  await expect(row).toHaveCount(1);

  await row.getByRole("button", { name: `Delete ${pub.name}` }).click();
  await page.getByRole("alertdialog", { name: `Delete ${pub.name}?` }).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(`${pub.name} is deleted.`)).toBeVisible();
  await expect(row).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/en/pubs\\?q=`));

  const response = await page.goto(`/en/pub/${pub.slug}`);
  expect(response?.status()).toBe(404);
});

test("regular users get no delete buttons in the pub list", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/pubs?q=Davle");
  await expect(page.getByRole("link", { name: "Remagen" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
});
