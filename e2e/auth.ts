import type { Page, TestInfo } from "@playwright/test";
import { expect } from "./fixtures";

/** A username and email nobody has used yet, also across runs on the same test database. */
export function newUser(testInfo: TestInfo) {
  const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.floor(Math.random() * 1e4)}`;
  return { username: `e2e_${id}`.slice(0, 20), email: `e2e-${id}@example.test` };
}

/** Signs up with the dev login (the e2e server sets AUTH_DEV_LOGIN=1) and finishes sign-up. */
export async function signUp(page: Page, testInfo: TestInfo, next = "") {
  const user = newUser(testInfo);
  await page.goto(`/en/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Dev login: Email").fill(user.email);
  await page.getByRole("button", { name: "Sign in (dev)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Finish signing up" })).toBeVisible();
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("I confirm I am 18 or over.").check();
  await page.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(page.getByLabel(`Account: @${user.username}`)).toBeVisible();
  return user;
}
