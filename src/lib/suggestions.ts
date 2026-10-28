import "server-only";
import { and, asc, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema as s } from "@/db";
import { checkInDay, TIME_ZONE } from "./checkin";
import { notifyAdmins, settleSuggestion } from "./notifications";

const { appSuggestions, users } = s;

/** Suggestions sent today (Prague calendar day) by this user, or by all signed-out visitors. */
export async function countSuggestionsToday(userId: string | null, now = new Date()) {
  const [row] = await db
    .select({ count: count() })
    .from(appSuggestions)
    .where(
      and(
        userId ? eq(appSuggestions.userId, userId) : isNull(appSuggestions.userId),
        sql`(${appSuggestions.createdAt} at time zone ${TIME_ZONE})::date = ${checkInDay(now)}::date`,
      ),
    );
  return row?.count ?? 0;
}

/** Stores a suggestion and tells the admins about it. */
export async function createSuggestion(input: { userId: string | null; message: string; page?: string }) {
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(appSuggestions).values(input).returning({ id: appSuggestions.id });
    await notifyAdmins(tx, { kind: "suggestion", actorId: input.userId, suggestionId: row.id });
  });
}

/**
 * Approves or declines a suggestion that is still pending, and settles its notification for
 * every admin. Returns false if another admin has already decided it.
 */
export async function resolveSuggestion(id: number, adminId: string, decision: "approved" | "declined") {
  const now = new Date();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(appSuggestions)
      .set({ status: decision, decidedAt: now, decidedBy: adminId })
      .where(and(eq(appSuggestions.id, id), eq(appSuggestions.status, "pending")))
      .returning({ id: appSuggestions.id });
    if (rows.length === 0) return false;
    await settleSuggestion(tx, id, now);
    return true;
  });
}

export async function countPendingSuggestions() {
  const [row] = await db.select({ count: count() }).from(appSuggestions).where(eq(appSuggestions.status, "pending"));
  return row?.count ?? 0;
}

const sender = alias(users, "sender");
const decider = alias(users, "decider");

function suggestionsQuery() {
  return db
    .select({
      id: appSuggestions.id,
      message: appSuggestions.message,
      page: appSuggestions.page,
      status: appSuggestions.status,
      createdAt: appSuggestions.createdAt,
      decidedAt: appSuggestions.decidedAt,
      username: sender.username,
      decider: decider.username,
    })
    .from(appSuggestions)
    .leftJoin(sender, eq(sender.id, appSuggestions.userId))
    .leftJoin(decider, eq(decider.id, appSuggestions.decidedBy));
}

/** Suggestions waiting for an admin, oldest first. */
export async function listPendingSuggestions() {
  return suggestionsQuery().where(eq(appSuggestions.status, "pending")).orderBy(asc(appSuggestions.createdAt));
}

/** The latest approved or declined suggestions. */
export async function listDecidedSuggestions(limit = 20) {
  return suggestionsQuery().where(ne(appSuggestions.status, "pending")).orderBy(desc(appSuggestions.decidedAt)).limit(limit);
}
