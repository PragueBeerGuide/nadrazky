"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "@/i18n/navigation";
import { CZ_BOUNDS, MAP_STYLE, PIN } from "@/lib/map";

export type MapPub = { slug: string; name: string; station: string; status: string; lat: number; lon: number };

export function PubMap({ pubs, statusLabels }: { pubs: MapPub[]; statusLabels: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      bounds: CZ_BOUNDS,
      fitBoundsOptions: { padding: 20 },
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: pubs.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { slug: p.slug, name: p.name, station: p.station, status: p.status },
      })),
    };

    map.on("load", () => {
      map.addSource("pubs", { type: "geojson", data, cluster: true, clusterRadius: 40, clusterMaxZoom: 11 });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "pubs",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": PIN.maybe_open,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
          "circle-stroke-color": PIN.stroke,
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pubs",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "pubs",
        type: "circle",
        source: "pubs",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["match", ["get", "status"], "open", PIN.open, "maybe_open", PIN.maybe_open, "closed", PIN.closed, PIN.unknown],
          "circle-radius": 7,
          "circle-stroke-color": PIN.stroke,
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const zoom = await (map.getSource("pubs") as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id);
        map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      map.on("click", "pubs", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { slug: string; name: string; station: string; status: string };
        const el = document.createElement("div");
        el.className = "grid gap-1 font-sans";
        const st = document.createElement("strong");
        st.textContent = p.station;
        const nm = document.createElement("span");
        nm.textContent = p.name;
        const s = document.createElement("span");
        s.className = "text-xs";
        s.textContent = statusLabels[p.status] ?? p.status;
        const btn = document.createElement("button");
        btn.className = "btn btn-primary mt-1 px-3 py-1.5 text-sm";
        btn.textContent = "→";
        btn.setAttribute("aria-label", p.name);
        btn.onclick = () => router.push({ pathname: "/pub/[slug]", params: { slug: p.slug } });
        el.append(st, nm, s, btn);
        new maplibregl.Popup({ offset: 10 }).setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(map);
      });
      for (const layer of ["clusters", "pubs"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
    });
    return () => map.remove();
  }, [pubs, router, statusLabels]);

  return <div ref={ref} className="h-full w-full" />;
}
