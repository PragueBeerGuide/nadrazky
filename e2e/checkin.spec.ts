import { devSignUp, newUser, signUp } from "./auth";
import { expect, test } from "./fixtures";

const PUB = "davle-sk-marina-chyse";
const PUB_NAME = "SK Marína Chýše";

test("signed out, check-in goes through the login and back", async ({ page }, testInfo) => {
  await page.goto(`/en/pub/${PUB}`);
  await page.getByRole("link", { name: "Log in to check in" }).click();
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fpub%2Fdavle-sk-marina-chyse%2Fcheck-in$/);
  await devSignUp(page, newUser(testInfo));
  await expect(page).toHaveURL(new RegExp(`/en/pub/${PUB}/check-in$`));
  await expect(page.getByRole("heading", { level: 1, name: PUB_NAME })).toBeVisible();
});

test("checks in on the spot with details, once a day", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo, `/en/pub/${PUB}/check-in`);
  await page.getByRole("checkbox", { name: "Beer" }).check();
  await page.getByRole("group", { name: "How many beers?" }).getByText("3", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Food" }).check();
  // Tap the visible button, as a user would (the radio itself is visually hidden).
  await page.getByRole("group", { name: /^Rating/ }).getByText("4", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "4 of 5" })).toBeChecked();
  await page.getByLabel(/^Note/).fill("Smažák a Kozel, moc milá obsluha.");
  await page.getByRole("radio", { name: "It was open" }).check();
  await page.getByRole("button", { name: "Check in here" }).click();

  await expect(page).toHaveURL(new RegExp(`/en/pub/${PUB}$`));
  await expect(page.getByText("You checked in here today")).toBeVisible();
  await expect(page.getByTestId("checkin-count")).toHaveText(/^\d+ check-ins?$/);
  await expect(page.getByRole("region", { name: "Check-ins" }).getByText(`@${user.username}`)).toBeVisible();
  await expect(page.getByTestId("last-visit")).toHaveText(/it was open$/);
  const mine = page.getByRole("list", { name: "Latest check-ins" }).getByRole("listitem").filter({ hasText: `@${user.username}` });
  await expect(mine).toContainText("Smažák a Kozel, moc milá obsluha.");
  await expect(mine.getByText("3 beers", { exact: true })).toBeVisible();
  await expect(mine.getByText("Food", { exact: true })).toBeVisible();
  await expect(mine.getByLabel("Rating 4 of 5")).toBeVisible();

  // The check-in page now says it is done for today.
  await page.goto(`/en/pub/${PUB}/check-in`);
  await expect(page.getByRole("heading", { name: "Checked in today" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check in here" })).toHaveCount(0);
});

test("checks in from anywhere, without asking for the location", async ({ page }, testInfo) => {
  // Record any request for the position; the browser grants none in this test.
  await page.addInitScript(() => {
    const w = window as unknown as { geoCalls: number };
    w.geoCalls = 0;
    const record = () => {
      w.geoCalls++;
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: record, watchPosition: record, clearWatch: () => {} },
    });
  });
  const user = await signUp(page, testInfo, `/en/pub/${PUB}/check-in`);
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${PUB}$`));
  await expect(page.getByRole("region", { name: "Check-ins" }).getByText(`@${user.username}`)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { geoCalls: number }).geoCalls)).toBe(0);
});

test("the server counts one check-in per pub per day", async ({ page, context }, testInfo) => {
  await signUp(page, testInfo, `/en/pub/${PUB}/check-in`);
  // A second tab opened before the first check-in still shows the form.
  const second = await context.newPage();
  await second.goto(`/en/pub/${PUB}/check-in`);

  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page.getByText("You checked in here today")).toBeVisible();

  await second.getByRole("button", { name: "Check in here" }).click();
  await expect(second.getByRole("main").getByRole("alert")).toHaveText("You've already checked in here today. Come back tomorrow.");
});

test("checks in in Czech, reporting the pub closed", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo);
  await page.goto(`/cs/hospoda/${PUB}`);
  await page.getByRole("link", { name: "Odbavit se" }).click();
  await expect(page).toHaveURL(new RegExp(`/cs/hospoda/${PUB}/odbaveni$`));
  await page.getByRole("checkbox", { name: "Panáka" }).check();
  await page.getByRole("group", { name: "Kolik panáků?" }).getByText("1", { exact: true }).click();
  await page.getByRole("radio", { name: "Bylo zavřeno" }).check();
  await page.getByRole("button", { name: "Odbavit se tady" }).click();

  await expect(page).toHaveURL(new RegExp(`/cs/hospoda/${PUB}$`));
  await expect(page.getByText("Dnes už tu máš odbaveno")).toBeVisible();
  const mine = page.getByRole("list", { name: "Poslední odbavení" }).getByRole("listitem").filter({ hasText: `@${user.username}` });
  await expect(mine.getByText("Zavřeno")).toBeVisible();
  await expect(mine.getByText("1 panák", { exact: true })).toBeVisible();
});

/**
 * These change a pub's status, so each uses its own pubs (listed as "status unknown"),
 * a different one for the desktop and the phone run.
 */
const UNKNOWN_PUBS = {
  open: ["praha-kolovraty-hostinec-u-medveda", "praha-krc-cyklovna"],
  closed: ["praha-kyje-restaurace-simanda", "praha-modrany-zastavka-modransky-biograf"],
} as const;

test("a check-in marks the pub open and confirmed today", async ({ page }, testInfo) => {
  const slug = UNKNOWN_PUBS.open[testInfo.project.name === "phone" ? 1 : 0];
  await signUp(page, testInfo, `/en/pub/${slug}/check-in`);
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${slug}$`));

  const hero = page.locator("article > section").first();
  await expect(hero.locator("[data-status]").first()).toHaveText("Open");
  await expect(page.locator("dt", { hasText: "Last confirmed" }).locator("+ dd")).toHaveText("today");
});

test("a check-in that found the pub closed only updates when it was last confirmed", async ({ page }, testInfo) => {
  const slug = UNKNOWN_PUBS.closed[testInfo.project.name === "phone" ? 1 : 0];
  await signUp(page, testInfo, `/en/pub/${slug}/check-in`);
  await page.getByRole("radio", { name: "It was closed" }).check();
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${slug}$`));

  const hero = page.locator("article > section").first();
  await expect(hero.locator("[data-status]").first()).toHaveText("Status unknown");
  await expect(page.locator("dt", { hasText: "Last confirmed" }).locator("+ dd")).toHaveText("today");
});

test("beer and shots need an amount before the check-in is sent", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo, `/en/pub/${PUB}/check-in`);
  const main = page.getByRole("main");
  await main.getByRole("checkbox", { name: "A shot" }).check();
  await main.getByLabel(/^Note/).fill("Kept while I pick.");
  await main.getByRole("button", { name: "Check in here" }).click();
  await expect(main.getByText("Choose how many.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${PUB}/check-in$`));
  await expect(main.getByLabel(/^Note/)).toHaveValue("Kept while I pick.");

  await main.getByRole("group", { name: "How many shots?" }).getByText("2", { exact: true }).click();
  await expect(main.getByText("Choose how many.")).toHaveCount(0);
  await main.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${PUB}$`));
  const mine = page.getByRole("region", { name: "Check-ins" }).getByRole("listitem").filter({ hasText: `@${user.username}` });
  await expect(mine.getByText("2 shots", { exact: true })).toBeVisible();
});

test("amounts in Czech", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo);
  await page.goto(`/cs/hospoda/${PUB}/odbaveni`);
  const main = page.getByRole("main");
  await main.getByRole("checkbox", { name: "Pivo" }).check();
  await main.getByRole("group", { name: "Kolik piv?" }).getByText("4", { exact: true }).click();
  await main.getByRole("checkbox", { name: "Jídlo" }).check();
  await main.getByRole("button", { name: "Odbavit se tady" }).click();
  await expect(page).toHaveURL(new RegExp(`/cs/hospoda/${PUB}$`));
  const mine = page.getByRole("region", { name: "Odbavení" }).getByRole("listitem").filter({ hasText: `@${user.username}` });
  await expect(mine.getByText("4 piva", { exact: true })).toBeVisible();
  await expect(mine.getByText("Jídlo", { exact: true })).toBeVisible();
});
