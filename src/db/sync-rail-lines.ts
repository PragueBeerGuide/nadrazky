/** Makes rail_lines match data/seed/rail-lines.json (see railLines.ts).  npm run db:rail-lines */
import { openDb } from "./client";
import { syncRailLines } from "./railLines";

async function main() {
  const { db, close } = openDb();
  const { lines, deleted } = await syncRailLines(db);
  console.log(`Rail lines synced: ${lines} lines${deleted.length ? `, deleted ${deleted.join(", ")}` : ""}.`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
