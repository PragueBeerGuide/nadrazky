import { signUp, newUser } from "./auth";
import { expect, test } from "./fixtures";

test("the login page is translated", async ({ page }) => {
  await page.goto("/cs/prihlaseni");
  await expect(page.getByRole("heading", { level: 1, name: "Přihlášení" })).toBeVisible();
  await expect(page.getByText("registrovat se můžeš až od 18 let")).toBeVisible();

  await page.goto("/en/login");
  await expect(page.getByRole("heading", { level: 1, name: "Log in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  await expect(page.getByText("you must be 18 or over to sign up")).toBeVisible();
  // No Google client is set up on the test server, so its button is hidden.
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
});

test("the header links to the login page", async ({ page }) => {
  await page.goto("/cs");
  await page.getByRole("banner").getByRole("link", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/cs\/prihlaseni$/);
});

test("asks for an email link", async ({ page }) => {
  await page.goto("/en/login");
  const email = page.getByLabel("Email", { exact: true });
  await email.fill("not-an-email");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await email.fill("someone@example.test");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText("We've sent a sign-in link to someone@example.test")).toBeVisible();
  await page.getByRole("button", { name: "Use another email" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("sign-up needs a valid username and the 18+ confirmation", async ({ page }, testInfo) => {
  const user = newUser(testInfo);
  await page.goto("/en/login");
  await page.getByLabel("Dev login: Email").fill(user.email);
  await page.getByRole("button", { name: "Sign in (dev)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Finish signing up" })).toBeVisible();

  await page.getByLabel("Username").fill("x!");
  await page.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(page.getByText("Use 3–20 characters")).toBeVisible();
  await expect(page.getByText("You must be 18 or over to use Nádražky.")).toBeVisible();

  // Until sign-up is finished, the header menu offers to finish it.
  await page.getByLabel(/^Account:/).click();
  await expect(page.getByRole("link", { name: "Finish signing up" })).toBeVisible();
});

test("signs up, shows the user in the header and logs out", async ({ page }, testInfo) => {
  const user = await signUp(page, testInfo);
  await expect(page).toHaveURL(/\/en$/);

  // Signed in, the login page sends the user on.
  await page.goto("/en/login");
  await expect(page).toHaveURL(/\/en$/);

  await page.getByLabel(`Account: @${user.username}`).click();
  await expect(page.getByText(user.email)).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
});

test("a taken username is refused", async ({ page, browser }, testInfo) => {
  const first = await signUp(page, testInfo);

  const other = await browser.newPage();
  const second = newUser(testInfo);
  await other.goto("/en/login");
  await other.getByLabel("Dev login: Email").fill(second.email);
  await other.getByRole("button", { name: "Sign in (dev)" }).click();
  await other.getByLabel("Username").fill(first.username.toUpperCase());
  await other.getByLabel("I confirm I am 18 or over.").check();
  await other.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(other.getByText("That username is taken.")).toBeVisible();
  await other.close();
});

test("returns to the page that sent the user to log in", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "/en/pubs");
  await expect(page).toHaveURL(/\/en\/pubs$/);
});

test("ignores a return address on another site", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "https://example.com/");
  await expect(page).toHaveURL(/\/en$/);
});
