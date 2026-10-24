import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * End-to-end tests against a production build, as the Next.js testing guide recommends.
 * The server runs on its own port with its own embedded database (data/pglite-e2e),
 * so it can run next to `npm run dev` without sharing the dev database.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  // On CI, also write the HTML report so a failed run can upload it.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run setup && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/cs`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // The dev login lets the tests sign in without Google (never on Vercel). The Google
    // client is a placeholder: it shows the button, and the tests stop at Google's door.
    env: {
      DATABASE_URL: "pglite://./data/pglite-e2e",
      AUTH_DEV_LOGIN: "1",
      AUTH_TRUST_HOST: "true",
      AUTH_GOOGLE_ID: "e2e-placeholder.apps.googleusercontent.com",
      AUTH_GOOGLE_SECRET: "e2e-placeholder",
    },
  },
});
