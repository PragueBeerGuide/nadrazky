import type { AdapterAccountType } from "next-auth/adapters";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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

export const pubStatus = pgEnum("pub_status", ["open", "maybe_open", "unknown", "closed"]);
export const pubKind = pgEnum("pub_kind", ["pub", "restaurant", "kiosk", "cafe", "unknown"]);
export const locationMatch = pgEnum("location_match", ["exact", "prefix", "manual", "review", "none"]);

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pubs_station_idx").on(t.stationId), index("pubs_status_idx").on(t.status)],
);

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Usernames are unique regardless of case: "Pivo" and "pivo" are the same person.
  (t) => [uniqueIndex("users_username_idx").on(sql`lower(${t.username})`)],
);

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
    hadBeer: boolean("had_beer").notNull().default(false),
    hadShot: boolean("had_shot").notNull().default(false),
    hadNonAlcoholic: boolean("had_non_alcoholic").notNull().default(false),
    hadSnack: boolean("had_snack").notNull().default(false),
    rating: smallint("rating"),
    note: text("note"),
    pubWasOpen: boolean("pub_was_open").notNull(),
  },
  (t) => [
    uniqueIndex("checkins_user_pub_day_idx").on(t.userId, t.pubId, t.day),
    index("checkins_pub_idx").on(t.pubId, t.createdAt),
    check("checkins_rating_check", sql`${t.rating} between 1 and 5`),
    check("checkins_note_check", sql`char_length(${t.note}) <= 280`),
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

export type Pub = typeof pubs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Station = typeof stations.$inferSelect;
export type Region = typeof regions.$inferSelect;
