import { defineConfig } from "drizzle-kit";

// Used only to generate SQL migrations from src/db/schema.ts (npm run db:generate).
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
