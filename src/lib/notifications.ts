import "server-only";
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema as s } from "@/db";
import { NOTIFICATION_LIMIT } from "./notification";

const { appSuggestions, notifications, pubReports, pubs, users } = s;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Tells the recipient of a new friend request; part of sending it. */
export async function notifyFriendRequest(tx: Tx, input: { recipientId: string; requesterId: string; friendRequestId: number }) {
  await tx.insert(notifications).values({
    userId: input.recipientId,
    kind: "friend_request",
    actorId: input.requesterId,
    friendRequestId: input.friendRequestId,
  });
}

/** Tells every admin, except whoever caused it, about a new suggestion or a report waiting for review. */
export async function notifyAdmins(
  tx: Tx,
  input: { actorId: string | null } & ({ kind: "suggestion"; suggestionId: number } | { kind: "report"; reportId: number }),
) {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), input.actorId ? ne(users.id, input.actorId) : undefined));
  if (admins.length === 0) return;
  const { kind, actorId } = input;
  const about = input.kind === "suggestion" ? { suggestionId: input.suggestionId } : { reportId: input.reportId };
  await tx.insert(notifications).values(admins.map((a) => ({ userId: a.id, kind, actorId, ...about })));
}

/** Answering a friend request settles its notification. */
export async function settleFriendRequest(tx: Tx, friendRequestId: number, now = new Date()) {
  await tx
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.friendRequestId, friendRequestId), isNull(notifications.readAt)));
}

/** A reviewed report settles its notification for every admin. */
export async function settleReport(tx: Tx, reportId: number, now = new Date()) {
  await tx.update(notifications).set({ readAt: now }).where(and(eq(notifications.reportId, reportId), isNull(notifications.readAt)));
}

/** A decided suggestion settles its notification for every admin. */
export async function settleSuggestion(tx: Tx, suggestionId: number, now = new Date()) {
  await tx
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.suggestionId, suggestionId), isNull(notifications.readAt)));
}

export async function countUnread(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

const actor = alias(users, "actor");

/** The user's newest notifications, with what the bell needs to describe each. */
export async function listNotifications(userId: string, limit = NOTIFICATION_LIMIT) {
  return db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      actor: actor.username,
      suggestion: appSuggestions.message,
      reportKind: pubReports.kind,
      pub: pubs.name,
    })
    .from(notifications)
    .leftJoin(actor, eq(actor.id, notifications.actorId))
    .leftJoin(appSuggestions, eq(appSuggestions.id, notifications.suggestionId))
    .leftJoin(pubReports, eq(pubReports.id, notifications.reportId))
    .leftJoin(pubs, eq(pubs.id, pubReports.pubId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

/** Marks one of the user's notifications read, or all of them without an id. */
export async function markRead(userId: string, id?: number) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), id === undefined ? undefined : eq(notifications.id, id)));
}
