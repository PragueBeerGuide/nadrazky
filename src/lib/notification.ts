/** What a notification is about; one kind per thing that sends one. */
export const NOTIFICATION_KINDS = ["friend_request", "suggestion", "report"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Notifications the bell lists, newest first. */
export const NOTIFICATION_LIMIT = 20;
/** How much of a suggestion the notification quotes. */
export const EXCERPT_MAX = 80;

/** Where a notification leads: the friends page for a request, moderation for the rest. */
export function notificationHref(kind: NotificationKind) {
  return kind === "friend_request" ? "/friends" : "/moderation";
}

/** The start of a message on one line, cut at a word and ended with "…" when longer than `max`. */
export function excerpt(text: string, max = EXCERPT_MAX) {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
