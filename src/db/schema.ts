import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pubs_station_idx").on(t.stationId), index("pubs_status_idx").on(t.status)],
);

export type Pub = typeof pubs.$inferSelect;
export type Station = typeof stations.$inferSelect;
export type Region = typeof regions.$inferSelect;
