import "server-only";
import { and, asc, count, desc, eq, isNotNull, ne, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { avatarUrl } from "./profile";
import { changeFor, containsPattern, relationFor, SEARCH_LIMIT, type FriendAction, type FriendChange, type Relation } from "./friend";

const { friendRequests, users } = s;

/** Another user as the friends pages show them. */
export type FriendUser = { id: string; username: string; avatarUrl: string | null; relation: Relation };

/** The pair's row, whichever of the two sent it. */
const between = (a: string, b: string | typeof users.id) =>
  or(
    and(eq(friendRequests.requesterId, a), eq(friendRequests.recipientId, b)),
    and(eq(friendRequests.requesterId, b), eq(friendRequests.recipientId, a)),
  );

/** Users who have finished signing up: only they can be found and asked. */
const finished = and(isNotNull(users.username), isNotNull(users.adultConfirmedAt));

/**
 * Sends, cancels, accepts, declines or removes, by the rules in src/lib/friend.ts.
 * Returns the change made, or null when the action doesn't apply (anymore), e.g. the
 * other user cancelled a moment ago or hasn't finished signing up.
 */
export async function applyFriendAction(meId: string, themId: string, action: FriendAction): Promise<FriendChange | null> {
  return db.transaction(async (tx) => {
    const [them] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, themId), finished));
    if (!them) return null;
    const [request] = await tx.select().from(friendRequests).where(between(meId, themId)).for("update");
    const change = changeFor(action, request, meId, themId);
    if (!change) return null;

    if (change.kind === "insert") {
      // Both sending at once: the pair's unique index lets only one row in.
      const rows = await tx
        .insert(friendRequests)
        .values({ requesterId: meId, recipientId: themId })
        .onConflictDoNothing()
        .returning({ id: friendRequests.id });
      return rows.length > 0 ? change : null;
    }
    // The row as read: if it changed since, nothing happens.
    const same = and(eq(friendRequests.id, request!.id), eq(friendRequests.status, request!.status));
    const rows =
      change.kind === "respond"
        ? await tx.update(friendRequests).set({ status: change.status, respondedAt: new Date() }).where(same).returning({ id: friendRequests.id })
        : await tx.delete(friendRequests).where(same).returning({ id: friendRequests.id });
    return rows.length > 0 ? change : null;
  });
}

/** Friend requests waiting for the user's answer: the count in the account menu. */
export async function countIncomingRequests(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(friendRequests)
    .where(and(eq(friendRequests.recipientId, userId), eq(friendRequests.status, "pending")));
  return row?.count ?? 0;
}

/** How many friends the user has and how many requests wait for their answer, for the profile. */
export async function countFriends(userId: string) {
  const [row] = await db
    .select({
      friends: sql<number>`count(*) filter (where ${friendRequests.status} = 'accepted')`.mapWith(Number),
      incoming: sql<number>`count(*) filter (where ${friendRequests.status} = 'pending' and ${friendRequests.recipientId} = ${userId})`.mapWith(Number),
    })
    .from(friendRequests)
    .where(or(eq(friendRequests.requesterId, userId), eq(friendRequests.recipientId, userId)));
  return { friends: row?.friends ?? 0, incoming: row?.incoming ?? 0 };
}

/** Signed-up users whose username contains the term, best matches first, with how each stands to `meId`. */
export async function searchUsers(meId: string, term: string): Promise<FriendUser[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUpdatedAt: users.avatarUpdatedAt,
      requesterId: friendRequests.requesterId,
      recipientId: friendRequests.recipientId,
      status: friendRequests.status,
    })
    .from(users)
    .leftJoin(friendRequests, between(meId, users.id))
    .where(and(finished, ne(users.id, meId), sql`lower(${users.username}) like ${containsPattern(term)}`))
    .orderBy(
      sql`lower(${users.username}) = ${term} desc`,
      sql`starts_with(lower(${users.username}), ${term}) desc`,
      asc(users.username),
    )
    .limit(SEARCH_LIMIT);
  return rows.map((r) => ({
    id: r.id,
    username: r.username!,
    avatarUrl: avatarUrl(r.id, r.avatarUpdatedAt),
    relation: relationFor(r.status ? { requesterId: r.requesterId!, recipientId: r.recipientId!, status: r.status } : null, meId),
  }));
}

/**
 * Everyone the user has a request or friendship with, as the friends page lists them:
 * requests waiting for them, requests they sent (newest first) and their friends (A to Z).
 */
export async function listFriendships(meId: string) {
  const other = sql<string>`case when ${friendRequests.requesterId} = ${meId} then ${friendRequests.recipientId} else ${friendRequests.requesterId} end`;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUpdatedAt: users.avatarUpdatedAt,
      requesterId: friendRequests.requesterId,
      recipientId: friendRequests.recipientId,
      status: friendRequests.status,
      createdAt: friendRequests.createdAt,
    })
    .from(friendRequests)
    .innerJoin(users, eq(users.id, other))
    .where(and(or(eq(friendRequests.requesterId, meId), eq(friendRequests.recipientId, meId)), finished))
    .orderBy(desc(friendRequests.createdAt));

  const people = rows.map((r) => ({
    id: r.id,
    username: r.username!,
    avatarUrl: avatarUrl(r.id, r.avatarUpdatedAt),
    relation: relationFor(r, meId),
  }));
  return {
    incoming: people.filter((p) => p.relation === "received"),
    outgoing: people.filter((p) => p.relation === "sent"),
    friends: people.filter((p) => p.relation === "friends").sort((a, b) => a.username.localeCompare(b.username)),
  };
}
