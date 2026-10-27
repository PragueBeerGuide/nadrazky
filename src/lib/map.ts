/** Our railway-first basemap over free OpenFreeMap vector tiles (scripts/build-map-style.mjs). */
export const MAP_STYLE = "/map/style.json";

/** Bounding box of the Czech Republic: [west, south, east, north]. */
export const CZ_BOUNDS: [number, number, number, number] = [12.09, 48.55, 18.86, 51.06];

/** Map pin colours, matching the Departures tokens in globals.css (MapLibre needs literal colours). */
export const PIN = {
  open: "#1E8A4F",
  unknown: "#A3ABB6",
  closed: "#B8402F",
  /** Text on a pin of that colour. */
  ink: { open: "#FFFFFF", unknown: "#0E1A2B", closed: "#FFFFFF" },
  stroke: "#FFFFFF",
  selected: "#12306A",
} as const;
