import type { Page } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/** A number on the profile and its label, e.g. stat(page, "pubs") -> "2" and "pubs visited out of 782". */
function stat(page: Page, key: string) {
  const tile = page.getByTestId(`stat-${key}`);
  return { value: tile.locator("dd"), label: tile.locator("dt") };
}

/** Checks in with ticks such as "Food" or, for beer and shots, an amount: "Beer:2". */
async function checkIn(page: Page, slug: string, ticks: string[] = []) {
  await page.goto(`/en/pub/${slug}/check-in`);
  for (const tick of ticks) {
    const [name, amount] = tick.split(":");
    await page.getByRole("checkbox", { name, exact: true }).check();
    if (amount) {
      const group = name === "Beer" ? "How many beers?" : "How many shots?";
      await page.getByRole("group", { name: group }).getByText(amount, { exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "Check in here" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/pub/${slug}$`));
}

test("signed out, the profile asks to log in first", async ({ page }) => {
  await page.goto("/en/profile");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fprofile$/);
});

test("a new user's profile is empty and reachable from the account menu", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo);
  await page.getByLabel(`Account: @${user.username}`).click();
  await page.getByRole("dialog").getByRole("link", { name: "Your profile" }).click();
  await expect(page).toHaveURL(/\/en\/profile$/);
  await expect(page.getByRole("heading", { level: 1, name: `@${user.username}` })).toBeVisible();
  await expect(stat(page, "pubs").value).toHaveText("0");
  await expect(page.getByRole("heading", { name: "No check-ins yet" })).toBeVisible();
});

test("counts the pubs, stations and regions a user has checked in at", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  // Two pubs at the same station (Davle, Central Bohemian Region).
  await checkIn(page, "davle-remagen", ["Beer:2", "Food"]);
  await checkIn(page, "davle-sk-marina-chyse", ["Beer:1", "A shot:3"]);

  await page.goto("/en/profile");
  await expect(stat(page, "pubs").value).toHaveText("2");
  await expect(stat(page, "pubs").label).toHaveText(/^pubs visitedout of \d+$/);
  await expect(stat(page, "checkIns").value).toHaveText("2");
  await expect(stat(page, "stations").value).toHaveText("1");
  await expect(stat(page, "stations").label).toHaveText("station");
  await expect(stat(page, "regions").value).toHaveText("1");
  await expect(stat(page, "regions").label).toHaveText("regionout of 14");
  await expect(page.getByText("3 beers", { exact: true })).toBeVisible();
  await expect(page.getByText("3 shots", { exact: true })).toBeVisible();
  await expect(page.getByText("1× food", { exact: true })).toBeVisible();

  const visited = page.getByRole("region", { name: "Pubs you've visited" });
  await expect(visited.getByRole("link")).toHaveCount(2);
  await expect(visited.getByRole("link", { name: /Remagen/ })).toContainText("1 visit");
  const regions = page.getByRole("region", { name: "By region" });
  await expect(regions.getByRole("listitem").first()).toContainText(/Central Bohemian Region\s*2 \/ \d+/);
});

test("the profile is in Czech too", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await checkIn(page, "davle-remagen", ["Beer:1"]);
  await page.goto("/cs/profil");
  await expect(page.getByRole("main").getByText("Tvůj profil")).toBeVisible();
  await expect(stat(page, "pubs").value).toHaveText("1");
  await expect(stat(page, "pubs").label).toHaveText(/^navštívená hospodaz celkem \d+$/);
  await expect(page.getByText("1 pivo", { exact: true })).toBeVisible();
});

/** A 1600×1200 JPEG "photo": a yellow disc on station-sign blue. */
async function photo() {
  const { default: sharp } = await import("sharp");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="100%" height="100%" fill="#12306a"/><circle cx="800" cy="600" r="380" fill="#f4c21b"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

test("adds a hometown and a profile picture, shown in the header and next to check-ins", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo, "/en/profile");
  const details = page.getByRole("form", { name: "Your details" });
  await details.locator('input[type="file"]').setInputFiles({ name: "me.jpg", mimeType: "image/jpeg", buffer: await photo() });
  await details.getByLabel(/^Hometown/).fill("  Česká   Třebová ");
  await details.getByRole("button", { name: "Save" }).click();
  await expect(details.getByRole("status")).toHaveText("Saved.");

  await page.reload();
  await expect(page.getByText("From Česká Třebová")).toBeVisible();
  const src = await page.locator("main h1 img").getAttribute("src");
  expect(src).toMatch(/^\/api\/avatar\/[\w-]+\?v=\d+$/);
  await expect(page.locator("header [data-slot=popover-trigger] img")).toHaveAttribute("src", src!);

  const picture = await page.request.get(src!);
  expect(picture.status()).toBe(200);
  expect(picture.headers()["content-type"]).toBe("image/webp");
  const { default: sharp } = await import("sharp");
  expect(await sharp(await picture.body()).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });

  await checkIn(page, "davle-remagen");
  const mine = page.getByRole("region", { name: "Check-ins" }).getByRole("listitem").filter({ hasText: `@${user.username}` });
  await expect(mine.locator("img")).toHaveAttribute("src", src!);

  // Removing it brings the initial back, and the old picture is gone.
  await page.goto("/en/profile");
  await page.getByRole("button", { name: "Remove picture" }).click();
  await page.getByRole("form", { name: "Your details" }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("form", { name: "Your details" }).getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.locator("main h1 img")).toHaveCount(0);
  expect((await page.request.get(src!)).status()).toBe(404);
});

test("a file that isn't a picture is refused", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/profile");
  const details = page.getByRole("form", { name: "Your details" });
  await details.locator('input[type="file"]').setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not a picture") });
  await expect(details.getByRole("alert")).toHaveText("We can't read that picture. Use a JPEG or PNG photo.");
});

test("the details form is in Czech too", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await page.goto("/cs/profil");
  const details = page.getByRole("form", { name: "Tvoje údaje" });
  await details.getByLabel(/^Odkud jsi/).fill("Kolín");
  await details.getByRole("button", { name: "Uložit" }).click();
  await expect(details.getByRole("status")).toHaveText("Uloženo.");
  await page.reload();
  await expect(page.getByText("Odkud: Kolín")).toBeVisible();
});
