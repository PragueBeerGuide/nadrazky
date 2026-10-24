"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { maplibregl } from "@/lib/maplibre";
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CZ_BOUNDS, MAP_STYLE, PIN } from "@/lib/map";
import type { PubStatus } from "@/lib/queries";
import type { MapPub } from "./MapExplorer";

/** A station with the visible pubs at it, best status first. */
export type MapStation = { id: number; name: string; lat: number; lon: number; best: PubStatus; pubs: MapPub[] };

const statusColor: ExpressionSpecification = ["match", ["get", "best"], "open", PIN.open, "closed", PIN.closed, PIN.unknown];
const statusInk: ExpressionSpecification = ["match", ["get", "best"], "open", PIN.ink.open, "closed", PIN.ink.closed, PIN.ink.unknown];
const noop = () => () => {};
const desktop = () => window.matchMedia("(min-width: 768px)").matches;

/**
 * MapLibre map with one pin per station: coloured by its best pub, bigger with a count when
 * it has several. Clusters take the colour of the best station inside them.
 */
export function PubMap({
  stations,
  selected,
  onSelect,
  fitKey,
  locate,
  popup,
}: {
  stations: MapStation[];
  selected: MapStation | null;
  onSelect: (id: number | null) => void;
  /** Fit the map to the stations whenever this changes (e.g. the chosen line). */
  fitKey: string;
  locate: boolean;
  popup: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const geoRef = useRef<maplibregl.GeolocateControl | null>(null);
  const onSelectRef = useRef(onSelect);
  const [loaded, setLoaded] = useState(false);
  // React renders the popup's content into this element; MapLibre moves it into each popup.
  const [popupEl] = useState(() => (typeof document === "undefined" ? null : document.createElement("div")));
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      bounds: CZ_BOUNDS,
      fitBoundsOptions: { padding: 20 },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const geo = new maplibregl.GeolocateControl({ trackUserLocation: false });
    geoRef.current = geo;
    map.addControl(geo, "top-right");

    map.on("load", () => {
      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 36,
        clusterMaxZoom: 10,
        clusterProperties: {
          open: ["+", ["case", ["==", ["get", "best"], "open"], 1, 0]],
          pubs: ["+", ["get", "count"]],
        },
      });
      const clusterBest: ExpressionSpecification = ["case", [">", ["get", "open"], 0], "open", "unknown"];
      map.addLayer({
        id: "clusters-shadow",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "rgba(14, 26, 43, 0.35)",
          "circle-radius": ["step", ["get", "pubs"], 17, 10, 20, 50, 24],
          "circle-blur": 0.5,
          "circle-translate": [0, 2],
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["match", clusterBest, "open", PIN.open, PIN.unknown],
          "circle-radius": ["step", ["get", "pubs"], 15, 10, 18, 50, 22],
          "circle-stroke-color": PIN.stroke,
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: { "text-field": ["to-string", ["get", "pubs"]], "text-size": 12, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": ["match", clusterBest, "open", PIN.ink.open, PIN.ink.unknown] },
      });
      map.addLayer({
        id: "stations-shadow",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(14, 26, 43, 0.35)",
          "circle-radius": ["case", [">", ["get", "count"], 1], 15, 11],
          "circle-blur": 0.5,
          "circle-translate": [0, 2],
        },
      });
      map.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": statusColor,
          "circle-radius": ["case", [">", ["get", "count"], 1], 12, 8],
          "circle-stroke-color": PIN.stroke,
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "selected",
        type: "circle",
        source: "stations",
        filter: ["==", ["get", "id"], -1],
        paint: {
          "circle-color": statusColor,
          "circle-radius": 16,
          "circle-stroke-color": PIN.stroke,
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "selected-ring",
        type: "circle",
        source: "stations",
        filter: ["==", ["get", "id"], -1],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": 19,
          "circle-stroke-color": PIN.selected,
          "circle-stroke-width": 4,
        },
      });
      map.addLayer({
        id: "station-count",
        type: "symbol",
        source: "stations",
        filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "count"], 1]],
        layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true },
        paint: { "text-color": statusInk },
      });
      map.addLayer({
        id: "station-names",
        type: "symbol",
        source: "stations",
        minzoom: 9.5,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-font": ["Noto Sans Bold"],
          "text-anchor": "left",
          "text-offset": [1.3, 0],
          "text-optional": true,
        },
        paint: { "text-color": "#0E1A2B", "text-halo-color": "#FFFFFF", "text-halo-width": 2 },
      });

      map.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const zoom = await (map.getSource("stations") as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id);
        map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      map.on("click", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["stations", "selected"] })[0];
        onSelectRef.current(f ? Number(f.properties.id) : null);
      });
      for (const layer of ["clusters", "stations"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      setLoaded(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pins follow the filters.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource("stations") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: stations.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: { id: s.id, name: s.name, best: s.best, count: s.pubs.length },
      })),
    });
  }, [stations, loaded]);

  // Fit to the stations when the line changes.
  const stationsRef = useRef(stations);
  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);
  useEffect(() => {
    const map = mapRef.current;
    const list = stationsRef.current;
    if (!map || !loaded || !fitKey || !list.length) return;
    const b = new maplibregl.LngLatBounds();
    for (const s of list) b.extend([s.lon, s.lat]);
    map.fitBounds(b, { padding: desktop() ? 60 : { top: 140, bottom: 60, left: 30, right: 30 }, maxZoom: 12 });
  }, [fitKey, loaded]);

  useEffect(() => {
    if (loaded && locate) geoRef.current?.trigger();
  }, [loaded, locate]);

  // Highlight the selected station; on a computer also open a popup over it.
  const selectedId = selected?.id ?? -1;
  const selectedLon = selected?.lon;
  const selectedLat = selected?.lat;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const layer of ["selected", "selected-ring"]) map.setFilter(layer, ["==", ["get", "id"], selectedId]);
    if (selectedId < 0 || selectedLon == null || selectedLat == null) return;
    const lngLat: [number, number] = [selectedLon, selectedLat];
    if (!map.getBounds().contains(lngLat) || map.getZoom() < 9) map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 11) });
    if (!desktop() || !popupEl) return;
    const p = new maplibregl.Popup({ offset: 22, maxWidth: "320px", closeOnClick: false })
      .setLngLat(lngLat)
      .setDOMContent(popupEl)
      .addTo(map);
    const onClose = () => onSelectRef.current(null);
    p.on("close", onClose);
    return () => {
      p.off("close", onClose);
      p.remove();
    };
  }, [selectedId, selectedLon, selectedLat, loaded, popupEl]);

  return (
    <>
      <div ref={ref} className="map-explorer h-full w-full" />
      {hydrated && popupEl && popup && createPortal(popup, popupEl)}
    </>
  );
}
