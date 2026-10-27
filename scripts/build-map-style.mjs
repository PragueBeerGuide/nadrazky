// Builds public/map/style.json, our basemap: OpenFreeMap's "liberty" style made to show the
// railways first. Tracks are drawn in ink with sleepers, roads go white and grey, and
// clutter (shops, 3D buildings, road shields) goes away. Colours come from the
// "Departures" palette in src/app/globals.css (MapLibre needs literal colours).
//
//   node scripts/build-map-style.mjs
//
// The output is committed, so the map doesn't change when liberty does upstream.
import { mkdirSync, writeFileSync } from "node:fs";

const SOURCE = "https://tiles.openfreemap.org/styles/liberty";
const OUT = "public/map/style.json";

const C = {
  ink: "#0e1a2b",
  muted: "#566070",
  signLine: "#5a72a6",
  boardMuted: "#8e9ab0",
  platform: "#f3f4f1",
  rule: "#d8dbd4",
  white: "#ffffff",
};

const style = await (await fetch(SOURCE)).json();

const drop = new Set([
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "building-3d",
  "road_one_way_arrow",
  "road_one_way_arrow_opposite",
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
]);
const isRail = (id) => /_(major|transit)_rail/.test(id);

const transportation = { source: "openmaptiles", "source-layer": "transportation" };
const notTunnel = ["!=", ["get", "brunnel"], "tunnel"];
const tunnel = ["==", ["get", "brunnel"], "tunnel"];
const mainline = ["all", ["==", ["get", "class"], "rail"], ["!", ["has", "service"]]];
const sidings = ["all", ["==", ["get", "class"], "rail"], ["has", "service"]];
const transit = ["==", ["get", "class"], "transit"];
/** Width of a main line by zoom; the casing and sleepers scale from it. */
const railWidth = (k = 1) => ["interpolate", ["exponential", 1.4], ["zoom"], 5, 0.7 * k, 8, 1.3 * k, 11, 2 * k, 14, 3.5 * k, 18, 7 * k];

const railLayers = [
  {
    id: "rail_tunnel",
    type: "line",
    ...transportation,
    filter: ["all", tunnel, ["match", ["get", "class"], ["rail", "transit"], true, false]],
    paint: { "line-color": C.boardMuted, "line-width": railWidth(0.8), "line-dasharray": [2, 1.5] },
  },
  {
    id: "rail_transit",
    type: "line",
    ...transportation,
    minzoom: 11,
    filter: ["all", notTunnel, transit],
    layout: { "line-join": "round" },
    paint: { "line-color": C.signLine, "line-width": railWidth(0.6) },
  },
  {
    id: "rail_sidings",
    type: "line",
    ...transportation,
    minzoom: 12,
    filter: ["all", notTunnel, sidings],
    layout: { "line-join": "round" },
    paint: { "line-color": C.boardMuted, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 16, 1.5, 18, 2.5] },
  },
  {
    id: "rail_casing",
    type: "line",
    ...transportation,
    filter: ["all", notTunnel, mainline],
    layout: { "line-join": "round" },
    paint: { "line-color": C.white, "line-width": railWidth(2.2), "line-opacity": 0.9 },
  },
  {
    id: "rail",
    type: "line",
    ...transportation,
    filter: ["all", notTunnel, mainline],
    layout: { "line-join": "round" },
    paint: { "line-color": C.ink, "line-width": railWidth() },
  },
  {
    id: "rail_sleepers",
    type: "line",
    ...transportation,
    minzoom: 13,
    filter: ["all", notTunnel, mainline],
    paint: { "line-color": C.white, "line-width": railWidth(0.5), "line-dasharray": [3, 3] },
  },
];

/** Local names (Czech) rather than liberty's English ones. */
const localName = ["coalesce", ["get", "name"], ["get", "name:latin"], ["get", "name_en"]];

const layers = [];
for (const layer of style.layers) {
  if (drop.has(layer.id) || isRail(layer.id)) continue;
  // The tracks go above the roads and bridges, under the buildings and labels.
  if (layer.id === "building") layers.push(...railLayers);
  const paint = (layer.paint ??= {});
  const layout = (layer.layout ??= {});

  if (layer.id === "background") paint["background-color"] = C.platform;
  else if (layer["source-layer"] === "transportation" && layer.type === "line" && !/path_pedestrian/.test(layer.id)) {
    // Roads: white with grey casings, so they read as context next to the tracks.
    paint["line-color"] = layer.id.endsWith("_casing") ? C.rule : C.white;
  } else if (layer.id === "poi_transit") {
    layer.minzoom = 12;
    layer.filter = ["==", ["get", "class"], "rail"];
    layout["text-field"] = localName;
    layout["text-font"] = ["Noto Sans Bold"];
    layout["text-size"] = 11;
    paint["text-color"] = C.signLine;
  } else if (layer["source-layer"] === "place" && layer.type === "symbol") {
    if (!layer.id.startsWith("label_country")) layout["text-field"] = localName;
    paint["text-color"] = /city|town/.test(layer.id) ? C.ink : C.muted;
  } else if (layer.type === "symbol" && layout["text-field"]) {
    layout["text-field"] = localName;
  }
  layers.push(layer);
}

style.name = "Nádražky";
style.layers = layers;
mkdirSync("public/map", { recursive: true });
writeFileSync(OUT, JSON.stringify(style, null, 1) + "\n");
console.log(`Wrote ${OUT} (${layers.length} layers).`);
