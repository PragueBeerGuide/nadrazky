/**
 * The railway register of stations and stops (SŽ's list with SR70 numbers, in
 * data/seed/railway-stations.csv), and matching our station names to it.
 * Free of database and file access so it can be unit tested.
 */
import { fold } from "./slug";

export type RegisterStation = {
  sr70: string;
  name: string;
  /** The shortened name timetables print ("Albrechtice u Č.Těš."). */
  timetableName: string;
  kind: "station" | "stop";
  lat: number;
  lon: number;
  /** The register's Czech region name, e.g. "Jihomoravský kraj". */
  region: string;
};

/** Splits CSV text into rows of fields: commas, quoted fields with "" for a quote, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/** The register's rows, read by their column names. */
export function parseRegister(text: string): RegisterStation[] {
  const [header, ...rows] = parseCsv(text);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`The station register has no "${name}" column.`);
    return i;
  };
  const c = { sr70: col("sr70_id"), name: col("name"), timetable: col("name_timetable"), type: col("type"), lat: col("lat"), lon: col("lon"), region: col("region") };
  return rows.map((r) => ({
    sr70: r[c.sr70].trim(),
    name: r[c.name].trim(),
    timetableName: r[c.timetable].trim(),
    kind: r[c.type].startsWith("Stop") ? "stop" : "station",
    lat: Number(r[c.lat]),
    lon: Number(r[c.lon]),
    region: r[c.region].trim(),
  }));
}

/** "Brno - Hlavní nádraží" and "Brno hlavní nádraží" both -> "brno hlavni nadrazi". */
export function stationKey(name: string) {
  return fold(name)
    .replace(/[-–.,/()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Finds a station's SR70 number from its name: first in the aliases (our short names
 * such as "Benešov" for "Benešov u Prahy"), then by the register's full or timetable
 * name, ignoring case, accents, dashes and dots. Null when the register doesn't list it.
 */
export function stationMatcher(register: RegisterStation[], aliases: Record<string, string>) {
  const byKey = new Map<string, string>();
  for (const s of register) byKey.set(stationKey(s.name), s.sr70);
  for (const s of register) if (!byKey.has(stationKey(s.timetableName))) byKey.set(stationKey(s.timetableName), s.sr70);
  return (name: string): string | null => aliases[name] ?? byKey.get(stationKey(name)) ?? null;
}
