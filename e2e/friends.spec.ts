import type { Page } from "@playwright/test";
import { signUp } from "./auth";
import { expect, test } from "./fixtures";

/** Searches for a username on the friends page and gives that person's row in the results. */
async function find(page: Page, username: string) {
  await page.goto("/en/friends");
  await page.getByRole("searchbox", { name: "Username" }).fill(`@${username}`);
  await page.getByRole("button", { name: "Search" }).click();
  return page.getByRole("list", { name: "Search results" }).getByRole("listitem").filter({ hasText: `@${username}` });
}

/** Someone's row in a section of the friends page, such as "Friend requests" or "Your friends". */
const row = (page: Page, section: string, username: string) =>
  page.getByRole("region", { name: section }).getByRole("listitem").filter({ hasText: `@${username}` });

test("signed out, the friends page asks to log in first", async ({ page }) => {
  await page.goto("/en/friends");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Ffriends$/);
});

test("finds a user by username, sends a request and they accept it", async ({ page, browser }, testInfo) => {
  const bobPage = await browser.newPage();
  const bob = await signUp(bobPage, testInfo);
  const anna = await signUp(page, testInfo);

  const result = await find(page, bob.username);
  await result.getByRole("button", { name: "Add friend" }).click();
  await expect(result).toContainText("Request sent");
  await expect(row(page, "Requests you sent", bob.username)).toBeVisible();

  // Bob sees the request waiting in his account menu and accepts it on the friends page.
  await bobPage.goto("/en");
  await bobPage.getByLabel(`Account: @${bob.username}`).click();
  const menuItem = bobPage.getByRole("menuitem", { name: /^Friends/ });
  await expect(menuItem).toContainText("1 new");
  await menuItem.click();
  await expect(bobPage).toHaveURL(/\/en\/friends$/);
  await row(bobPage, "Friend requests", anna.username).getByRole("button", { name: "Accept" }).click();
  await expect(row(bobPage, "Your friends", anna.username)).toBeVisible();
  await expect(bobPage.getByRole("region", { name: "Friend requests" })).toHaveCount(0);
  await expect(bobPage.getByRole("heading", { level: 1, name: "Friends" })).toBeVisible();
  await expect(bobPage.getByText("You have 1 friend.")).toBeVisible();

  await bobPage.getByLabel(`Account: @${bob.username}`).click();
  await expect(bobPage.getByRole("menuitem", { name: /^Friends/ })).not.toContainText("new");
  await bobPage.close();

  await page.reload();
  await expect(row(page, "Your friends", bob.username)).toBeVisible();
  await expect(page.getByRole("region", { name: "Requests you sent" })).toHaveCount(0);
  await expect((await find(page, bob.username)).getByText("Friends", { exact: true })).toBeVisible();
});

test("a declined request stays sent for the requester until they cancel it", async ({ page, browser }, testInfo) => {
  const bobPage = await browser.newPage();
  const bob = await signUp(bobPage, testInfo);
  const anna = await signUp(page, testInfo);

  await (await find(page, bob.username)).getByRole("button", { name: "Add friend" }).click();
  await expect(row(page, "Requests you sent", bob.username)).toBeVisible();

  await bobPage.goto("/en/friends");
  await row(bobPage, "Friend requests", anna.username).getByRole("button", { name: "Decline" }).click();
  await expect(bobPage.getByRole("region", { name: "Friend requests" })).toHaveCount(0);
  // Bob can still find Anna and ask her himself.
  await expect((await find(bobPage, anna.username)).getByRole("button", { name: "Add friend" })).toBeVisible();
  await bobPage.close();

  await page.reload();
  const sent = row(page, "Requests you sent", bob.username);
  await expect(sent).toContainText("Request sent");
  await sent.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("region", { name: "Requests you sent" })).toHaveCount(0);
  await expect((await find(page, bob.username)).getByRole("button", { name: "Add friend" })).toBeVisible();
});

test("search doesn't list yourself or take what can't be a username", async ({ page }, testInfo) => {
  const me = await signUp(page, testInfo);
  await find(page, me.username);
  await expect(page.getByText(`Nobody's username contains “${me.username}”.`)).toBeVisible();

  await page.getByRole("searchbox", { name: "Username" }).fill("jan novák");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("Type at least 2 characters of a username")).toBeVisible();
});

test("the profile links to friends, in Czech too", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/profile");
  const friends = page.getByRole("region", { name: "Friends" });
  await expect(friends).toContainText("No friends yet.");
  await friends.getByRole("link", { name: "Friends and requests" }).click();
  await expect(page).toHaveURL(/\/en\/friends$/);

  await page.goto("/cs/pratele");
  await expect(page.getByRole("heading", { level: 1, name: "Přátelé" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Přezdívka" })).toBeVisible();
});
