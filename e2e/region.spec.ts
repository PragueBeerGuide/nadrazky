import { expect, test } from "./fixtures";

test("a region lists its pubs in Czech alphabetical order within each status", async ({ page }) => {
  await page.goto("/cs/kraj/pardubicky");
  const rows = page.locator("main ul.card > li");
  await expect(rows.first()).toBeVisible();
  const items = await rows.evaluateAll((lis) =>
    lis.map((li) => ({
      station: li.querySelector("p.text-sm span")?.textContent?.split(" · ")[0] ?? "",
      status: li.querySelector(".chip")?.className ?? "",
    })),
  );
  const collator = new Intl.Collator("cs");
  for (let i = 1; i < items.length; i++) {
    if (items[i].status !== items[i - 1].status) continue;
    expect(collator.compare(items[i - 1].station, items[i].station), `${items[i - 1].station} before ${items[i].station}`).toBeLessThanOrEqual(0);
  }
  // Stations starting with Č come right after C, not after Z.
  const stations = items.map((x) => x.station);
  const firstC = stations.findIndex((s) => s.startsWith("Č"));
  const firstV = stations.findIndex((s) => s.startsWith("V"));
  expect(firstC).toBeGreaterThanOrEqual(0);
  expect(firstC).toBeLessThan(firstV);
});
