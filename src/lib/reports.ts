import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { checkInDay, TIME_ZONE } from "./checkin";

const { pubReports } = s;

/** How many reports a user has sent today (Prague calendar day), for the daily limit. */
export async function countReportsToday(userId: string, now = new Date()) {
  const [row] = await db
    .select({ count: count() })
    .from(pubReports)
    .where(
      and(
        eq(pubReports.userId, userId),
        sql`(${pubReports.createdAt} at time zone ${TIME_ZONE})::date = ${checkInDay(now)}::date`,
      ),
    );
  return row?.count ?? 0;
}
