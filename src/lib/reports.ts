import "server-only";
import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema as s } from "@/db";
import type { Role } from "./auth/roles";
import { checkInDay, TIME_ZONE } from "./checkin";
import { changeFor, isAutoApproved, type ReportKind } from "./report";
import { livePub } from "./queries";

const { pubReports, pubs, stations, users } = s;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

/** Applies an approved report to its pub; reports without an automatic change leave the pub alone. */
async function applyToPub(tx: Tx, report: { pubId: number; kind: ReportKind; value: string | null }, now: Date) {
  const change = changeFor(report.kind, report.value, now);
  if (change) await tx.update(pubs).set({ ...change, updatedAt: now }).where(eq(pubs.id, report.pubId));
}

/**
 * Stores a report. A moderator's or admin's report is approved by themselves at once and
 * its change applied; anyone else's waits as "open" for review.
 */
export async function createReport(input: { pubId: number; user: { id: string; role: Role }; kind: ReportKind; value?: string; message?: string }) {
  const now = new Date();
  const approved = isAutoApproved(input.user.role);
  await db.transaction(async (tx) => {
    await tx.insert(pubReports).values({
      pubId: input.pubId,
      userId: input.user.id,
      kind: input.kind,
      value: input.value,
      message: input.message,
      createdAt: now,
      ...(approved ? { status: "accepted" as const, resolvedAt: now, resolvedBy: input.user.id } : {}),
    });
    if (approved) await applyToPub(tx, { pubId: input.pubId, kind: input.kind, value: input.value ?? null }, now);
  });
  return { autoApproved: approved };
}

/**
 * Approves or rejects a report that is still open; approving applies its change to the pub.
 * Returns false if someone else has already handled it.
 */
export async function resolveReport(reportId: number, moderatorId: string, decision: "accepted" | "rejected") {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [report] = await tx
      .update(pubReports)
      .set({ status: decision, resolvedAt: now, resolvedBy: moderatorId })
      .where(and(eq(pubReports.id, reportId), eq(pubReports.status, "open")))
      .returning({ pubId: pubReports.pubId, kind: pubReports.kind, value: pubReports.value });
    if (!report) return false;
    if (decision === "accepted") await applyToPub(tx, report, now);
    return true;
  });
}

export async function countOpenReports() {
  const [row] = await db
    .select({ count: count() })
    .from(pubReports)
    .innerJoin(pubs, eq(pubs.id, pubReports.pubId))
    .where(and(eq(pubReports.status, "open"), livePub));
  return row?.count ?? 0;
}

const reporter = alias(users, "reporter");
const resolver = alias(users, "resolver");
const reportFields = {
  id: pubReports.id,
  kind: pubReports.kind,
  value: pubReports.value,
  message: pubReports.message,
  status: pubReports.status,
  createdAt: pubReports.createdAt,
  resolvedAt: pubReports.resolvedAt,
  reporter: reporter.username,
  resolver: resolver.username,
  autoApproved: sql<boolean>`${pubReports.resolvedBy} = ${pubReports.userId}`,
  pub: {
    slug: pubs.slug,
    name: pubs.name,
    status: pubs.status,
    openingHours: pubs.openingHours,
    address: pubs.address,
    beers: pubs.beers,
  },
  station: stations.name,
};

function reportsQuery() {
  return db
    .select(reportFields)
    .from(pubReports)
    .innerJoin(pubs, and(eq(pubs.id, pubReports.pubId), livePub))
    .innerJoin(stations, eq(stations.id, pubs.stationId))
    .innerJoin(reporter, eq(reporter.id, pubReports.userId))
    .leftJoin(resolver, eq(resolver.id, pubReports.resolvedBy));
}

export type ReportRow = Awaited<ReturnType<typeof listOpenReports>>[number];

/** Reports waiting for review, oldest first. */
export async function listOpenReports() {
  return reportsQuery().where(eq(pubReports.status, "open")).orderBy(asc(pubReports.createdAt));
}

/** The latest approved or rejected reports, newest first. */
export async function listResolvedReports(limit = 20) {
  return reportsQuery().where(ne(pubReports.status, "open")).orderBy(desc(pubReports.resolvedAt)).limit(limit);
}
