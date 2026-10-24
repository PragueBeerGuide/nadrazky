/** Applies the SQL migrations in ./drizzle to the configured database.  npm run db:migrate */
import { openDb } from "./client";

async function main() {
  const { db, kind, close } = openDb();
  if (kind === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as unknown as Parameters<typeof migrate>[0], { migrationsFolder: "drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  }
  console.log(`Migrations applied (${kind}).`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
