import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { livePub } from "./queries";

const { pubs } = s;

/**
 * Deletes a pub for everyone: the row stays, with its check-ins and reports, marked with
 * who deleted it and when, and livePub hides it everywhere. Doesn't check who asks; the
 * server action checks canDeletePubs first. Returns false if it was already deleted.
 */
export async function deletePub(pubId: number, userId: string) {
  const rows = await db
    .update(pubs)
    .set({ deletedAt: new Date(), deletedBy: userId })
    .where(and(eq(pubs.id, pubId), livePub))
    .returning({ id: pubs.id });
  return rows.length > 0;
}
