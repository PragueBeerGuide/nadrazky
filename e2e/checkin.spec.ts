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
  await page.getByRole("checkbox", { name: "Snack" }).check();
  await page.getByRole("radio", { name: "4 of 5" }).check({ force: true });
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
  await expect(mine.getByText("Beer", { exact: true })).toBeVisible();
  await expect(mine.getByText("Snack", { exact: true })).toBeVisible();
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
  await page.getByRole("radio", { name: "Bylo zavřeno" }).check();
  await page.getByRole("button", { name: "Odbavit se tady" }).click();

  await expect(page).toHaveURL(new RegExp(`/cs/hospoda/${PUB}$`));
  await expect(page.getByText("Dnes už tu máš odbaveno")).toBeVisible();
  const mine = page.getByRole("list", { name: "Poslední odbavení" }).getByRole("listitem").filter({ hasText: `@${user.username}` });
  await expect(mine.getByText("Zavřeno")).toBeVisible();
  await expect(mine.getByText("Panáka")).toBeVisible();
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
  await expect(hero.locator(".chip").first()).toHaveText("Open");
  await expect(page.locator("dt", { hasText: "Last confirmed" }).locator("+ dd")).toHaveText("today");
});

test("a check-in that found the pub closed only updates when it was last confirmed", async ({ page }, testInfo) => {
  const slug = UNKNOWN_PUBS.closed[testInfo.project.name === "phone" ? 1 : 0];
  await signUp(page, testInfo, `/en/pub/${slug}/check-in`);
  await page.getByRole("radio", { name: "It was closed" }).check();
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${slug}$`));

  const hero = page.locator("article > section").first();
  await expect(hero.locator(".chip").first()).toHaveText("Status unknown");
  await expect(page.locator("dt", { hasText: "Last confirmed" }).locator("+ dd")).toHaveText("today");
});
