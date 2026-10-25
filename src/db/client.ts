/**
 * One database client for the app and the scripts.
 *
 *   DATABASE_URL=pglite://./data/pglite        -> embedded Postgres (PGlite), no install needed
 *   DATABASE_URL=postgresql://user:pw@host/db  -> a real Postgres server (Neon in production)
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Both drivers expose the same query API; one type keeps call sites simple. */
export type Db = PostgresJsDatabase<typeof schema>;

export const DEFAULT_URL = "pglite://./data/pglite";

/** Opens the database. Both drivers connect lazily, but PGlite takes its data folder at once. */
export function openDb(url = process.env.DATABASE_URL || DEFAULT_URL) {
  if (url.startsWith("pglite://")) {
    const dir = url.slice("pglite://".length);
    mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    const db = drizzlePglite(client, { schema }) as unknown as Db;
    return { db, kind: "pglite" as const, close: () => client.close() };
  }
  const client = postgres(url, { max: 5 });
  const db: Db = drizzlePostgres(client, { schema });
  return { db, kind: "postgres" as const, close: () => client.end() };
}
