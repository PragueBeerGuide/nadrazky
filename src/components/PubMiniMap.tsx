"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE, PIN } from "@/lib/map";

export function PubMiniMap({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      center: [lon, lat],
      zoom: 15,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    new maplibregl.Marker({ color: PIN.open }).setLngLat([lon, lat]).addTo(map);
    return () => map.remove();
  }, [lat, lon]);
  return <div ref={ref} role="img" aria-label={label} className="h-56 w-full bg-accent" />;
}
