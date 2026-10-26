/** Adds and updates all railway stations and stops from the register (see stations.ts).  npm run db:stations */
import { openDb } from "./client";
import { syncStations } from "./stations";

async function main() {
  const { db, close } = openDb();
  const { stations, added, claimed, merged, outside } = await syncStations(db);
  console.log(
    `Stations synced: ${stations} in the register, ${added} added, ${claimed} matched to existing stations` +
      (merged.length ? `; merged: ${merged.join(", ")}` : "") +
      (outside.length ? `; not in the register: ${outside.join(", ")}.` : "."),
  );
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
