import type { Page, TestInfo } from "@playwright/test";
import { expect } from "./fixtures";

/** A username and email nobody has used yet, also across runs on the same test database. */
export function newUser(testInfo: TestInfo) {
  const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.floor(Math.random() * 1e4)}`;
  return { username: `e2e_${id}`.slice(0, 20), email: `e2e-${id}@example.test` };
}

/** On the English login page: signs in with the dev login (AUTH_DEV_LOGIN=1 on the e2e server) and finishes sign-up. */
export type Role = "user" | "moderator" | "admin";

export async function devSignUp(page: Page, user: { username: string; email: string }, role: Role = "user") {
  await page.getByLabel("Dev login: Email").fill(user.email);
  await page.getByLabel("Dev login: Role").selectOption(role);
  await page.getByRole("button", { name: "Sign in (dev)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Finish signing up" })).toBeVisible();
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("I confirm I am 18 or over.").check();
  await page.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(page.getByLabel(`Account: @${user.username}`)).toBeVisible();
}

/** Signs up a new user with a role (default: a regular user), then goes on to `next` (a same-site path) or home. */
export async function signUp(page: Page, testInfo: TestInfo, next = "", role: Role = "user") {
  const user = newUser(testInfo);
  await page.goto(`/en/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await devSignUp(page, user, role);
  return user;
}
