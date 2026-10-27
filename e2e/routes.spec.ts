import { DAVLE_PUB, expect, test } from "./fixtures";

// Every page in both languages, with its translated URL.
const routes = [
  { cs: "/cs", en: "/en" },
  { cs: "/cs/mapa", en: "/en/map" },
  { cs: "/cs/hospody", en: "/en/pubs" },
  { cs: `/cs/hospoda/${DAVLE_PUB}`, en: `/en/pub/${DAVLE_PUB}` },
  { cs: "/cs/kraje", en: "/en/regions" },
  { cs: "/cs/kraj/praha", en: "/en/region/praha" },
  { cs: "/cs/trate", en: "/en/lines" },
  { cs: "/cs/trat/210", en: "/en/line/210" },
  { cs: "/cs/odznaky", en: "/en/badges" },
  { cs: "/cs/odznaky/nadrazak", en: "/en/badges/nadrazak" },
  { cs: "/cs/odznaky/trat/210", en: "/en/badges/line/210" },
  { cs: "/cs/odznaky/kraj/praha", en: "/en/badges/region/praha" },
  { cs: "/cs/o-aplikaci", en: "/en/about" },
  { cs: "/cs/prihlaseni", en: "/en/login" },
  { cs: "/cs/ochrana-soukromi", en: "/en/privacy" },
];

for (const route of routes) {
  for (const locale of ["cs", "en"] as const) {
    const path = route[locale];
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page).toHaveTitle(/Nádražky/);
      await expect(page.locator("h1:visible")).toHaveCount(1);

      // Nothing sticks out sideways, on a computer or a phone.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test("an unknown page shows the 404 page", async ({ page }) => {
  const response = await page.goto("/en/nope");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This train doesn't stop here" })).toBeVisible();
});
