import type { Page } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/** A value nobody else will have sent, to find this test's notification. */
const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/** Opens the bell's popover and gives its list of notifications. */
async function openBell(page: Page) {
  await page.getByRole("button", { name: /^Notifications/ }).click();
  return page.getByRole("dialog").getByRole("list", { name: "Notifications" });
}

async function sendRequest(page: Page, username: string) {
  await page.goto("/en/friends");
  await page.getByRole("searchbox", { name: "Username" }).fill(`@${username}`);
  await page.getByRole("button", { name: "Search" }).click();
  const result = page.getByRole("list", { name: "Search results" }).getByRole("listitem").filter({ hasText: `@${username}` });
  await result.getByRole("button", { name: "Add friend" }).click();
  await expect(result).toContainText("Pending");
}

test("signed out, there's no bell", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("button", { name: /^Notifications/ })).toHaveCount(0);
});

test("a friend request notifies its recipient until they open it", async ({ page, browser }, testInfo) => {
  const bobPage = await browser.newPage();
  const bob = await signUp(bobPage, testInfo);
  await expect(bobPage.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  const anna = await signUp(page, testInfo);
  await sendRequest(page, bob.username);

  await bobPage.reload();
  const list = await openBell(bobPage);
  const item = list.getByRole("link", { name: `New: Friend request from @${anna.username}` });
  await expect(item).toBeVisible();
  await expect(bobPage.getByRole("button", { name: "Notifications: 1 unread" })).toBeVisible();
  await item.click();
  await expect(bobPage).toHaveURL(/\/en\/friends$/);
  await expect(bobPage.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();

  // Still listed, but read.
  const read = (await openBell(bobPage)).getByRole("link", { name: `Friend request from @${anna.username}` });
  await expect(read).toBeVisible();
  await expect(read).not.toContainText("New:");
  await bobPage.close();
});

test("a cancelled friend request takes its notification with it", async ({ page, browser }, testInfo) => {
  const bobPage = await browser.newPage();
  const bob = await signUp(bobPage, testInfo);
  const anna = await signUp(page, testInfo);
  await sendRequest(page, bob.username);
  await page.getByRole("region", { name: "Requests you sent" }).getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByRole("region", { name: "Requests you sent" })).toHaveCount(0);

  await bobPage.reload();
  await expect(bobPage.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await bobPage.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(bobPage.getByRole("dialog")).toContainText("No notifications yet.");
  await expect(bobPage.getByRole("dialog")).not.toContainText(anna.username);
  await bobPage.close();
});

test("admins are told about a new suggestion, regular users aren't", async ({ page, browser }, testInfo) => {
  const adminPage = await browser.newPage();
  await signUp(adminPage, testInfo, "/en", "admin");
  const message = unique("Show the departure times");
  const user = await signUp(page, testInfo);
  await page.getByRole("button", { name: "Suggest an improvement" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Your idea" }).fill(message);
  await page.getByRole("dialog").getByRole("button", { name: "Send suggestion" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Thank you!" })).toBeVisible();

  await adminPage.reload();
  const item = (await openBell(adminPage)).getByRole("link", { name: `Suggestion from @${user.username}: “${message}”` });
  await expect(item).toContainText("New:");
  await adminPage.getByRole("dialog").getByRole("button", { name: "Mark all as read" }).click();
  await expect(item).not.toContainText("New:");

  // The sender, a regular user, gets nothing.
  await page.reload();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await adminPage.close();
});

test("admins are told about a report, and reviewing it settles the notification", async ({ page, browser }, testInfo) => {
  const adminPage = await browser.newPage();
  await signUp(adminPage, testInfo, "/en", "admin");
  const hours = unique("Mon–Sun 9–21");
  const user = await signUp(page, testInfo, "/en/pub/davle-remagen/report");
  const main = page.getByRole("main");
  await main.getByRole("radio", { name: "Opening hours" }).check();
  await main.getByRole("textbox", { name: "Opening hours" }).fill(hours);
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  await adminPage.reload();
  const item = (await openBell(adminPage)).getByRole("link", { name: `New: Report about Remagen from @${user.username}: Opening hours` });
  await expect(item).toBeVisible();
  await adminPage.keyboard.press("Escape");
  await adminPage.goto("/en/moderation");

  // Rejecting it (it changes nothing at the pub) marks it read for every admin.
  const report = adminPage.getByRole("list", { name: "Reports waiting for review" }).getByRole("listitem").filter({ hasText: hours });
  await report.getByRole("button", { name: "Reject" }).click();
  await expect(report).toHaveCount(0);
  await expect((await openBell(adminPage)).getByRole("link", { name: `Report about Remagen from @${user.username}: Opening hours` })).not.toContainText("New:");
  await adminPage.close();
});
