import "server-only";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { checkInDay, TIME_ZONE } from "./checkin";

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

export async function createSuggestion(input: { userId: string | null; message: string; page?: string }) {
  await db.insert(appSuggestions).values(input);
}

/** The newest suggestions for the moderation page, with the sender's username when signed in. */
export async function listSuggestions(limit = 50) {
  return db
    .select({
      id: appSuggestions.id,
      message: appSuggestions.message,
      page: appSuggestions.page,
      createdAt: appSuggestions.createdAt,
      username: users.username,
    })
    .from(appSuggestions)
    .leftJoin(users, eq(users.id, appSuggestions.userId))
    .orderBy(desc(appSuggestions.createdAt))
    .limit(limit);
}
