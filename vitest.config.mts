import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unit tests for logic and synchronous components. Pages are async Server Components,
// which Vitest can't render, so they are covered by the Playwright tests in e2e/.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "messages/**/*.test.ts"],
  },
});
