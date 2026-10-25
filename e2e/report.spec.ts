import { signUp } from "./auth";
import { expect, test } from "./fixtures";

const PUB = "davle-remagen";

test("signed out, Report a change goes through the login and back", async ({ page }) => {
  await page.goto(`/en/pub/${PUB}`);
  await page.getByRole("link", { name: "Report a change" }).click();
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fpub%2Fdavle-remagen%2Freport$/);
});

test("reports new opening hours, checking what each kind needs", async ({ page }, testInfo) => {
  await signUp(page, testInfo, `/en/pub/${PUB}/report`);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: "Remagen" })).toBeVisible();
  // A pub we list as open offers "closed", not "it's open".
  await expect(main.getByRole("radio", { name: "It has closed for good" })).toBeVisible();
  await expect(main.getByRole("radio", { name: "It's open" })).toHaveCount(0);

  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByText("Choose what has changed.")).toBeVisible();

  await main.getByRole("radio", { name: "Opening hours" }).check();
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByText("Fill in the new value.")).toBeVisible();
  await expect(main.getByRole("radio", { name: "Opening hours" })).toBeChecked();

  await main.getByRole("textbox", { name: "Opening hours" }).fill("Mon–Sun 10–22");
  await main.getByRole("textbox", { name: /^Details/ }).fill("Saw the sign on the door on Saturday.");
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  await main.getByRole("button", { name: "Report something else" }).click();
  await expect(main.getByRole("radio", { name: "Opening hours" })).not.toBeChecked();
});

test("a wrong position needs a description", async ({ page }, testInfo) => {
  await signUp(page, testInfo, `/en/pub/${PUB}/report`);
  const main = page.getByRole("main");
  await main.getByRole("radio", { name: "It's somewhere else on the map" }).check();
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByText("Describe the change.")).toBeVisible();
  await main.getByRole("textbox", { name: /^Details/ }).fill("It's in the old station building, across the tracks.");
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("heading", { name: "Thank you!" })).toBeVisible();
});

test("reports a closed pub in Czech", async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await page.goto(`/cs/hospoda/${PUB}`);
  await page.getByRole("link", { name: "Nahlásit změnu" }).click();
  await expect(page).toHaveURL(/\/cs\/hospoda\/davle-remagen\/nahlasit-zmenu$/);
  const main = page.getByRole("main");
  await main.getByRole("radio", { name: "Natrvalo zavřela" }).check();
  await main.getByRole("button", { name: "Odeslat hlášení" }).click();
  await expect(main.getByRole("heading", { name: "Díky!" })).toBeVisible();
});

test("one user can send 10 reports a day", async ({ page }, testInfo) => {
  test.slow();
  await signUp(page, testInfo, `/en/pub/${PUB}/report`);
  const main = page.getByRole("main");
  for (let i = 0; i < 10; i++) {
    await main.getByRole("radio", { name: "It has closed for good" }).check();
    await main.getByRole("button", { name: "Send report" }).click();
    await expect(main.getByRole("heading", { name: "Thank you!" })).toBeVisible();
    await main.getByRole("button", { name: "Report something else" }).click();
  }
  await main.getByRole("radio", { name: "It has closed for good" }).check();
  await main.getByRole("button", { name: "Send report" }).click();
  await expect(main.getByRole("alert")).toHaveText("You've sent 10 reports today. Try again tomorrow.");
});
