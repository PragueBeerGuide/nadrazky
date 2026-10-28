import type { AdapterAccountType } from "next-auth/adapters";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Check-ins and reports only ever set "open" or "closed"; "unknown" is where every pub starts. */
export const pubStatus = pgEnum("pub_status", ["open", "unknown", "closed"]);
export const pubKind = pgEnum("pub_kind", ["pub", "restaurant", "kiosk", "cafe", "unknown"]);
export const locationMatch = pgEnum("location_match", ["exact", "prefix", "manual", "review", "none"]);
/** A station (stanice) or a stop (zastávka), as the railway register lists it. */
export const stationKind = pgEnum("station_kind", ["station", "stop"]);

/** The 14 Czech regions (kraje). */
export const regions = pgTable("regions", {
  slug: text("slug").primaryKey(),
  nameCs: text("name_cs").notNull(),
  nameEn: text("name_en").notNull(),
});

/** Rail lines by their official number (e.g. 010, 170). */
export const railLines = pgTable("rail_lines", {
  number: text("number").primaryKey(),
  nameCs: text("name_cs").notNull(),
});

export const stations = pgTable(
  "stations",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** The station's SR70 number in the railway register (data/seed/railway-stations.csv); null for stations it no longer lists. */
    sr70: text("sr70").unique(),
    kind: stationKind("kind"),
    wikidataId: text("wikidata_id"),
    regionSlug: text("region_slug").references(() => regions.slug),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
  },
  (t) => [index("stations_region_idx").on(t.regionSlug)],
);

export const stationLines = pgTable(
  "station_lines",
  {
    stationId: integer("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    lineNumber: text("line_number")
      .notNull()
      .references(() => railLines.number, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.stationId, t.lineNumber] })],
);

export const pubs = pgTable(
  "pubs",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    stationId: integer("station_id")
      .notNull()
      .references(() => stations.id),
    kind: pubKind("kind").notNull().default("unknown"),
    status: pubStatus("status").notNull().default("unknown"),
    closedYear: integer("closed_year"),
    /** Own position when known; otherwise the station's position is used. */
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    address: text("address"),
    openingHours: text("opening_hours"),
    beers: text("beers"),
    descriptionCs: text("description_cs"),
    descriptionEn: text("description_en"),
    locationMatch: locationMatch("location_match").notNull().default("exact"),
    sourceId: integer("source_id").unique(),
    sourceUrl: text("source_url"),
    sourceLastUpdateMonthsAgo: integer("source_last_update_months_ago"),
    /** The latest check-in or approved open/closed report; "last confirmed" falls back to the source's months. */
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    /** Deleted by a moderator or admin: kept with its check-ins and reports, but hidden everywhere (livePub in src/lib/queries.ts). */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pubs_station_idx").on(t.stationId), index("pubs_status_idx").on(t.status)],
);

/** Binary data (Postgres bytea), for profile pictures. */
const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => Buffer.from(value),
});

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);
export const userLanguage = pgEnum("user_language", ["cs", "en"]);

/**
 * Accounts. Auth.js creates the row on the first sign-in with Google;
 * the user then picks a username and confirms they are 18+ (adultConfirmedAt).
 * Until both are set the sign-up is not finished. Roles are set by hand for now.
 */
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    username: text("username"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
    image: text("image"),
    language: userLanguage("language").notNull().default("cs"),
    role: userRole("role").notNull().default("user"),
    adultConfirmedAt: timestamp("adult_confirmed_at", { withTimezone: true }),
    /** Optional, as the user writes it. */
    hometown: text("hometown"),
    /** When the profile picture (user_avatars) last changed; null without one. Busts caches in its URL. */
    avatarUpdatedAt: timestamp("avatar_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Usernames are unique regardless of case: "Pivo" and "pivo" are the same person.
  (t) => [
    uniqueIndex("users_username_idx").on(sql`lower(${t.username})`),
    check("users_hometown_check", sql`char_length(${t.hometown}) <= 60`),
  ],
);

/** Profile pictures, as 256×256 WebP re-encoded on upload (src/lib/avatar.ts). */
export const userAvatars = pgTable("user_avatars", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  image: bytea("image").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sign-in methods linked to a user (Google). Used by the Auth.js Drizzle adapter. */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("accounts_user_idx").on(t.userId)],
);

/** Visits to a pub: one per user, pub and Prague calendar day. No location is used or kept. */
export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pubId: integer("pub_id")
      .notNull()
      .references(() => pubs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** The calendar day in Prague (YYYY-MM-DD) the check-in counts for. */
    day: date("day", { mode: "string" }).notNull(),
    /** How many beers and shots; 0 for none. */
    beers: smallint("beers").notNull().default(0),
    shots: smallint("shots").notNull().default(0),
    hadNonAlcoholic: boolean("had_non_alcoholic").notNull().default(false),
    /** "Food" in the app; the column keeps its first name. */
    hadFood: boolean("had_snack").notNull().default(false),
    rating: smallint("rating"),
    note: text("note"),
    pubWasOpen: boolean("pub_was_open").notNull(),
  },
  (t) => [
    uniqueIndex("checkins_user_pub_day_idx").on(t.userId, t.pubId, t.day),
    index("checkins_pub_idx").on(t.pubId, t.createdAt),
    check("checkins_rating_check", sql`${t.rating} between 1 and 5`),
    check("checkins_note_check", sql`char_length(${t.note}) <= 280`),
    check("checkins_beers_check", sql`${t.beers} between 0 and 10`),
    check("checkins_shots_check", sql`${t.shots} between 0 and 10`),
  ],
);

export const pubReportKind = pgEnum("pub_report_kind", [
  "closed",
  "reopened",
  "name",
  "hours",
  "address",
  "beers",
  "location",
  "other",
]);
export const pubReportStatus = pgEnum("pub_report_status", ["open", "accepted", "rejected"]);

/**
 * "Report a change" from users: what changed at a pub, waiting for a moderator.
 * `value` is the proposed new name, hours, address or beers; `message` the user's details.
 */
export const pubReports = pgTable(
  "pub_reports",
  {
    id: serial("id").primaryKey(),
    pubId: integer("pub_id")
      .notNull()
      .references(() => pubs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: pubReportKind("kind").notNull(),
    value: text("value"),
    message: text("message"),
    status: pubReportStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("pub_reports_status_idx").on(t.status, t.createdAt),
    index("pub_reports_pub_idx").on(t.pubId),
    index("pub_reports_user_idx").on(t.userId, t.createdAt),
    check("pub_reports_value_check", sql`char_length(${t.value}) <= 200`),
    check("pub_reports_message_check", sql`char_length(${t.message}) <= 1000`),
  ],
);

export const friendRequestStatus = pgEnum("friend_request_status", ["pending", "accepted", "declined"]);

/**
 * Friend requests, and the friendships they become once accepted. One row per pair of
 * users whichever way it was sent (the unique index on the pair), never to oneself.
 * The rules for sending, accepting and the rest are in src/lib/friend.ts.
 */
export const friendRequests = pgTable(
  "friend_requests",
  {
    id: serial("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendRequestStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the recipient accepted or declined it. */
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("friend_requests_pair_idx").on(
      sql`least(${t.requesterId}, ${t.recipientId})`,
      sql`greatest(${t.requesterId}, ${t.recipientId})`,
    ),
    index("friend_requests_recipient_idx").on(t.recipientId, t.status),
    index("friend_requests_requester_idx").on(t.requesterId, t.status),
    check("friend_requests_not_self_check", sql`${t.requesterId} <> ${t.recipientId}`),
  ],
);

/**
 * Badge levels a user has earned, one row per level and never taken away (src/lib/badges.ts).
 * `badge` is "pubs" (Nádražák), "line:<number>" or "region:<slug>"; `complete` marks the
 * level that finished the line or region. `seenAt` stays empty until the user has seen
 * the "new badge" popup.
 */
export const userBadges = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badge: text("badge").notNull(),
    level: smallint("level").notNull(),
    complete: boolean("complete").notNull().default(false),
    /** The check-in that reached the level. */
    checkinId: integer("checkin_id").references(() => checkins.id, { onDelete: "set null" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("user_badges_user_badge_level_idx").on(t.userId, t.badge, t.level),
    index("user_badges_unseen_idx").on(t.userId, t.seenAt),
    check("user_badges_level_check", sql`${t.level} >= 1`),
  ],
);

export const suggestionStatus = pgEnum("suggestion_status", ["pending", "approved", "declined"]);

/**
 * "Suggest an improvement" from the floating button on every page: free-text ideas about the
 * app itself. Anyone may send one; `userId` is empty for signed-out visitors and `page` is the
 * path they were on. Each waits as "pending" until an admin approves or declines it.
 */
export const appSuggestions = pgTable(
  "app_suggestions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    message: text("message").notNull(),
    page: text("page"),
    status: suggestionStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("app_suggestions_created_idx").on(t.createdAt),
    index("app_suggestions_status_idx").on(t.status, t.createdAt),
    index("app_suggestions_user_idx").on(t.userId, t.createdAt),
    check("app_suggestions_message_check", sql`char_length(${t.message}) <= 2000`),
    check("app_suggestions_page_check", sql`char_length(${t.page}) <= 300`),
  ],
);

export const notificationKind = pgEnum("notification_kind", ["friend_request", "suggestion", "report"]);

/**
 * In-app notifications, one row per recipient (src/lib/notifications.ts): a friend request
 * for its recipient, and a new suggestion or a report waiting for review for every admin.
 * Each points at what it is about, so deleting that (a cancelled request) deletes it too.
 * `actorId` is who caused it, empty for a signed-out visitor; `readAt` stays empty until read.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    friendRequestId: integer("friend_request_id").references(() => friendRequests.id, { onDelete: "cascade" }),
    suggestionId: integer("suggestion_id").references(() => appSuggestions.id, { onDelete: "cascade" }),
    reportId: integer("report_id").references(() => pubReports.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt),
    index("notifications_unread_idx").on(t.userId, t.readAt),
    index("notifications_friend_request_idx").on(t.friendRequestId),
    index("notifications_report_idx").on(t.reportId),
  ],
);

export type Pub = typeof pubs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Station = typeof stations.$inferSelect;
export type Region = typeof regions.$inferSelect;
