import "server-only";
import { createDb, type Db } from "./client";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { db?: Promise<Db> };

// Reuse one connection across hot reloads in development.
const dbPromise = globalForDb.db ?? createDb().then((c) => c.db);
if (process.env.NODE_ENV !== "production") globalForDb.db = dbPromise;

export const db: Db = await dbPromise;
export { schema };
