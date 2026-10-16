/**
 * One database client for the app and the scripts.
 *
 *   DATABASE_URL=pglite://./data/pglite        -> embedded Postgres (PGlite), no install needed
 *   DATABASE_URL=postgresql://user:pw@host/db  -> a real Postgres server (Neon in production)
 */
import { mkdirSync } from "node:fs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/** Both drivers expose the same query API; one type keeps call sites simple. */
export type Db = PostgresJsDatabase<typeof schema>;

export const DEFAULT_URL = "pglite://./data/pglite";

export async function createDb(url = process.env.DATABASE_URL || DEFAULT_URL) {
  if (url.startsWith("pglite://")) {
    const dir = url.slice("pglite://".length);
    mkdirSync(dir, { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite(dir);
    const db = drizzle(client, { schema }) as unknown as Db;
    return { db, kind: "pglite" as const, close: () => client.close() };
  }
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(url, { max: 5 });
  const db: Db = drizzle(client, { schema });
  return { db, kind: "postgres" as const, close: () => client.end() };
}
