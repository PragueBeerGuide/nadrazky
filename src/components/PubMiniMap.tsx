"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE, PIN } from "@/lib/map";
import type { PubStatus } from "@/lib/queries";

export function PubMiniMap({ lat, lon, label, status = "open" }: { lat: number; lon: number; label: string; status?: PubStatus }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      center: [lon, lat],
      zoom: 14,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    // Selected-pin look: status colour, white border, sign-blue ring.
    const el = document.createElement("span");
    el.style.cssText = `width:34px;height:34px;border-radius:50%;background:${PIN[status]};border:4px solid #fff;box-sizing:border-box;box-shadow:0 0 0 3px ${PIN.selected},0 4px 10px rgba(14,26,43,.3)`;
    new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
    return () => map.remove();
  }, [lat, lon, status]);
  return <div ref={ref} role="img" aria-label={label} className="h-[260px] w-full bg-[#e8ebe3]" />;
}
