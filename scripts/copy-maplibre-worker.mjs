// MapLibre runs its tile worker from a separate file that bundlers don't emit,
// so we serve it from /public. Runs on install and before dev/build.
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");
