import "server-only";
import { PgDatabase } from "drizzle-orm/pg-core";
import { openDb, type Db } from "./client";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * The database opens on the first query, not on import. `next dev` loads route modules
 * in short-lived worker processes; opening PGlite there too would put two processes
 * on one data folder and corrupt it. One connection is reused across hot reloads.
 */
function real(): Db {
  globalForDb.db ??= openDb().db;
  return globalForDb.db;
}

// Drizzle's PgDatabase prototype lets `is(db, PgDatabase)` checks pass without opening it.
export const db: Db = new Proxy(Object.create(PgDatabase.prototype) as Db, {
  get(_, prop) {
    const target = real();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export { schema };
