import type { Page } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/** A message nobody else will have sent, to find this test's suggestion. */
const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/** Opens the form from the floating button (desktop) or the tab bar (phone); only one of them shows. */
async function openSuggestion(page: Page, name = "Suggest an improvement") {
  await page.getByRole("button", { name }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function sendSuggestion(page: Page, message: string) {
  const dialog = await openSuggestion(page);
  await dialog.getByRole("textbox", { name: "Your idea" }).fill(message);
  await dialog.getByRole("button", { name: "Send suggestion" }).click();
  await expect(dialog.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await dialog.getByRole("status").getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
}

test("on a phone the button is in the tab bar, on a desktop it floats", async ({ page }, testInfo) => {
  await page.goto("/en/pubs");
  const inTabBar = page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Suggest an improvement" });
  if (testInfo.project.name === "phone") {
    await expect(inTabBar).toBeVisible();
    await expect(page.getByRole("button", { name: "Suggest an improvement" })).toHaveCount(1);
  } else {
    await expect(inTabBar).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Suggest an improvement" })).toBeVisible();
  }
});

test("signed out, anyone can send a suggestion", async ({ page }) => {
  await page.goto("/en/pubs");
  const dialog = await openSuggestion(page);
  await expect(dialog.getByRole("heading", { name: "Suggest an improvement" })).toBeVisible();

  await dialog.getByRole("button", { name: "Send suggestion" }).click();
  await expect(dialog.getByText("Write at least 5 characters.")).toBeVisible();

  await dialog.getByRole("textbox", { name: "Your idea" }).fill(unique("Filter pubs open on Sundays"));
  await dialog.getByRole("button", { name: "Send suggestion" }).click();
  await expect(dialog.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await dialog.getByRole("status").getByRole("button", { name: "Close" }).click();

  // Opening it again starts a new, empty form.
  const again = await openSuggestion(page);
  await expect(again.getByRole("textbox", { name: "Your idea" })).toHaveValue("");
});

test("sends a suggestion in Czech", async ({ page }) => {
  await page.goto("/cs");
  const dialog = await openSuggestion(page, "Navrhnout vylepšení");
  await dialog.getByRole("textbox", { name: "Váš nápad" }).fill(unique("Filtr podle otevírací doby"));
  await dialog.getByRole("button", { name: "Odeslat návrh" }).click();
  await expect(dialog.getByRole("heading", { name: "Děkujeme!" })).toBeVisible();
});

test("moderators read suggestions with who sent them and from where", async ({ page, browser }, testInfo) => {
  const message = unique("Dark mode, please");
  const user = await signUp(page, testInfo, "/en/lines");
  await sendSuggestion(page, message);

  const moderator = await browser.newPage();
  await signUp(moderator, testInfo, "/en/moderation", "moderator");
  const item = moderator.getByRole("region", { name: "Suggestions for the app" }).getByRole("listitem").filter({ hasText: message });
  await expect(item).toContainText(`@${user.username}`);
  await expect(item).toContainText("/en/lines");
  await moderator.close();
});

test("one user can send 5 suggestions a day", async ({ page }, testInfo) => {
  test.slow();
  await signUp(page, testInfo, "/en/pubs");
  for (let i = 0; i < 5; i++) await sendSuggestion(page, unique(`Idea ${i + 1}`));
  const dialog = await openSuggestion(page);
  await dialog.getByRole("textbox", { name: "Your idea" }).fill(unique("One idea too many"));
  await dialog.getByRole("button", { name: "Send suggestion" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Too many suggestions today. Try again tomorrow.");
});
