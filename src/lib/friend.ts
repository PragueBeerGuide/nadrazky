import { z } from "zod";
import { USERNAME_MAX } from "@/lib/auth/signup";

/**
 * Friend requests between users. One row per pair (src/db/schema.ts, friend_requests);
 * these rules decide what each of the two sees and what each may do with it.
 * Kept free of the database so it can be unit tested; src/lib/friends.ts applies it.
 */
export type FriendRequestStatus = "pending" | "accepted" | "declined";
export type FriendRequest = { requesterId: string; recipientId: string; status: FriendRequestStatus };

/** How another user stands to me: shown next to them in search results and lists. */
export type Relation = "none" | "sent" | "received" | "friends";

export const FRIEND_ACTIONS = ["send", "cancel", "accept", "decline", "remove"] as const;
export type FriendAction = (typeof FRIEND_ACTIONS)[number];

/** What to do to the pair's row. */
export type FriendChange = { kind: "insert" } | { kind: "respond"; status: "accepted" | "declined" } | { kind: "delete" };

/**
 * The pair's row as `me` sees it. Declining is quiet: the requester keeps seeing their
 * request as sent (and may cancel it), while the one who declined sees no request at all.
 */
export function relationFor(request: FriendRequest | null | undefined, me: string): Relation {
  if (!request) return "none";
  if (request.status === "accepted") return "friends";
  if (request.requesterId === me) return "sent";
  return request.status === "pending" ? "received" : "none";
}

/**
 * The change `me` makes to the pair's row with an action, or null when the action doesn't
 * apply (asking oneself, asking twice, accepting a request that was never sent…).
 * Sending to someone whose request is waiting for me, or whom I declined earlier,
 * accepts their request rather than starting a second one.
 */
export function changeFor(action: FriendAction, request: FriendRequest | null | undefined, me: string, them: string): FriendChange | null {
  if (me === them) return null;
  if (request && !isBetween(request, me, them)) return null;
  const relation = relationFor(request, me);
  switch (action) {
    case "send":
      if (!request) return { kind: "insert" };
      return request.recipientId === me && request.status !== "accepted" ? { kind: "respond", status: "accepted" } : null;
    case "cancel":
      return relation === "sent" ? { kind: "delete" } : null;
    case "accept":
      return relation === "received" ? { kind: "respond", status: "accepted" } : null;
    case "decline":
      return relation === "received" ? { kind: "respond", status: "declined" } : null;
    case "remove":
      return relation === "friends" ? { kind: "delete" } : null;
  }
}

function isBetween(request: FriendRequest, a: string, b: string) {
  return (request.requesterId === a && request.recipientId === b) || (request.requesterId === b && request.recipientId === a);
}

/** A friend action as posted by its form: which action, and to whom. */
export const friendActionSchema = z.object({
  action: z.enum(FRIEND_ACTIONS),
  userId: z.string().trim().min(1).max(100),
});

/** Results shown for one search. */
export const SEARCH_LIMIT = 20;
export const SEARCH_MIN = 2;

/**
 * The username part of a search as typed: "@Pivar " -> "pivar". Null when there is too
 * little to search for or it can't be part of a username (only a–z, digits and _).
 * Users are found by username only: their names are private (see the privacy page).
 */
export function searchTerm(query: unknown): string | null {
  if (typeof query !== "string") return null;
  const term = query.trim().replace(/^@/, "").toLowerCase();
  if (term.length < SEARCH_MIN || term.length > USERNAME_MAX || !/^[a-z0-9_]+$/.test(term)) return null;
  return term;
}

/** A LIKE pattern matching usernames that contain the term; "_" is a wildcard in LIKE, so it is escaped. */
export function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
