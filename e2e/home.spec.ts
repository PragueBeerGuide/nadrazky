import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/** Dates of the visible board's rows that have one (confirmed on the site). */
async function boardDates(board: import("@playwright/test").Locator) {
  const dates = await board.locator("li time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")));
  return dates.filter((d): d is string => !!d);
}

test("the home board lists the latest confirmed pubs first, saying when", async ({ page }, testInfo) => {
  // One user checks in at two open pubs at Davle, Remagen after Posezení U Kotvy.
  await signUp(page, testInfo, "/en/pub/davle-posezeni-u-kotvy/check-in");
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(/\/en\/pub\/davle-posezeni-u-kotvy$/);
  await page.goto("/en/pub/davle-remagen/check-in");
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(/\/en\/pub\/davle-remagen$/);

  await page.goto("/en");
  const board = page.getByRole("region", { name: "Open — confirmed lately" });
  const rows = board.getByRole("listitem");
  await expect(rows.first().locator("time")).toContainText("today");

  // Newest first: Remagen above Posezení U Kotvy (other tests may check in elsewhere meanwhile).
  const names = await rows.allInnerTexts();
  const remagen = names.findIndex((n) => n.includes("Remagen"));
  const kotva = names.findIndex((n) => n.includes("Posezení U Kotvy"));
  expect(remagen).toBeGreaterThanOrEqual(0);
  expect(kotva).toBeGreaterThan(remagen);

  const dates = await boardDates(board);
  expect(dates.length).toBeGreaterThanOrEqual(2);
  expect([...dates].sort().reverse()).toEqual(dates);
});

test("the home board says it in Czech too", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/pub/davle-sk-marina-chyse/check-in");
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(/\/en\/pub\/davle-sk-marina-chyse$/);
  await page.goto("/cs");
  const board = page.getByRole("region", { name: "V provozu — nedávno ověřeno" });
  await expect(board.getByRole("listitem").first().locator("time")).toContainText("dnes");
});
