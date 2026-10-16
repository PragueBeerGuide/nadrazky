/** Free OpenStreetMap-based vector tiles, no API key needed. */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** Bounding box of the Czech Republic: [west, south, east, north]. */
export const CZ_BOUNDS: [number, number, number, number] = [12.09, 48.55, 18.86, 51.06];

/** Map pin colours, matching the design-system tokens (MapLibre needs literal colours). */
export const PIN = {
  open: "#ef4c00", // secondary
  maybe_open: "#34009a", // primary
  unknown: "#8b8dd1", // muted violet
  closed: "#9a9a9a",
  stroke: "#ffffff",
} as const;
