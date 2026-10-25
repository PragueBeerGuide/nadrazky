import type { Page, TestInfo } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/**
 * Approving changes a pub, so each test changes its own pub, and the desktop and phone
 * runs (which go in parallel) use a different one each.
 */
const PUBS = {
  approve: ["praha-cakovice-hospudka-na-kolejich", "praha-cakovice-u-fausta"],
  reject: ["praha-branik-nadrazni-restaurace-branik", "praha-dejvice-restaurace-dejvicke-nadrazi"],
  auto: ["praha-hlubocepy-besedni-restaurace-hlubocepy", "praha-horni-pocernice-pivovar-pocernak"],
  markOpen: ["praha-hostivar-restaurace-u-hostivarskeho-nadrazi", "praha-klanovice-bistro-bazar"],
} as const;
const pubFor = (test: keyof typeof PUBS, info: TestInfo) => PUBS[test][info.project.name === "phone" ? 1 : 0];
/** A value nobody else will have sent, to find this test's report. */
const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function reportHours(page: Page, slug: string, hours: string) {
  await page.goto(`/en/pub/${slug}/report`);
  const main = page.getByRole("main");
  await main.getByRole("radio", { name: "Opening hours" }).check();
  await main.getByRole("textbox", { name: "Opening hours" }).fill(hours);
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("heading", { name: "Thank you!" })).toBeVisible();
}

test("signed out, the moderation page asks to log in", async ({ page }) => {
  await page.goto("/en/moderation");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fmoderation$/);
});

test("a regular user can't open the moderation page", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  const response = await page.goto("/en/moderation");
  expect(response?.status()).toBe(404);
});

test("a user's report waits until a moderator approves it", async ({ page, browser }, testInfo) => {
  const slug = pubFor("approve", testInfo);
  const hours = unique("Mon–Sun 10–22");
  await signUp(page, testInfo);
  await reportHours(page, slug, hours);
  await page.goto(`/en/pub/${slug}`);
  await expect(page.getByText(hours)).toHaveCount(0);

  const moderator = await browser.newPage();
  await signUp(moderator, testInfo, "/en/moderation", "moderator");
  const report = moderator.getByRole("list", { name: "Reports waiting for review" }).getByRole("listitem").filter({ hasText: hours });
  await expect(report).toContainText("Opening hours");
  await report.getByRole("button", { name: "Approve" }).click();
  await expect(report).toHaveCount(0);
  await expect(moderator.getByRole("region", { name: "Recently resolved" })).toContainText(hours);

  await page.goto(`/en/pub/${slug}`);
  await expect(page.getByText(hours)).toBeVisible();
  await moderator.close();
});

test("a rejected report doesn't change the pub", async ({ page, browser }, testInfo) => {
  const slug = pubFor("reject", testInfo);
  const hours = unique("Mon–Fri 8–9");
  await signUp(page, testInfo);
  await reportHours(page, slug, hours);

  const moderator = await browser.newPage();
  await signUp(moderator, testInfo, "/en/moderation", "admin");
  const report = moderator.getByRole("list", { name: "Reports waiting for review" }).getByRole("listitem").filter({ hasText: hours });
  await report.getByRole("button", { name: "Reject" }).click();
  await expect(report).toHaveCount(0);

  await page.goto(`/en/pub/${slug}`);
  await expect(page.getByText(hours)).toHaveCount(0);
  await moderator.close();
});

test("a moderator's own report is approved at once", async ({ page }, testInfo) => {
  const slug = pubFor("auto", testInfo);
  const beers = unique("Kozel 11°");
  await signUp(page, testInfo, `/en/pub/${slug}/report`, "moderator");
  const main = page.getByRole("main");
  await main.getByRole("radio", { name: "Beers on tap" }).check();
  await main.getByRole("textbox", { name: "On tap now" }).fill(beers);
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("status")).toContainText("is approved, because you're a moderator");

  await page.goto(`/en/pub/${slug}`);
  await expect(page.getByText(beers)).toBeVisible();
  await page.goto("/en/moderation");
  await expect(page.getByRole("list", { name: "Reports waiting for review" }).getByText(beers)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Recently resolved" })).toContainText(beers);
});

test("a pub of unknown status can be reported open", async ({ page }, testInfo) => {
  const slug = pubFor("markOpen", testInfo);
  await signUp(page, testInfo, `/en/pub/${slug}/report`, "moderator");
  const main = page.getByRole("main");
  // Unknown status: both status reports are offered, "it's open" first.
  const radios = main.getByRole("radio");
  await expect(radios.nth(0)).toHaveAccessibleName("It's open");
  await expect(radios.nth(1)).toHaveAccessibleName("It has closed for good");

  await main.getByRole("radio", { name: "It's open" }).check();
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("status")).toContainText("is approved");

  await page.goto(`/en/pub/${slug}`);
  await expect(page.locator("article > section").first().locator("[data-status]").first()).toHaveText("Open");
  await expect(page.locator("dt", { hasText: "Last confirmed" }).locator("+ dd")).toHaveText("today");
});

test("moderators reach the queue from the account menu, in Czech too", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo, "", "moderator");
  await page.goto("/cs");
  await page.getByLabel(`Účet: @${user.username}`).click();
  await page.getByRole("link", { name: /^Moderace/ }).click();
  await expect(page).toHaveURL(/\/cs\/moderace$/);
  await expect(page.getByRole("heading", { level: 1, name: "Moderace" })).toBeVisible();
});
