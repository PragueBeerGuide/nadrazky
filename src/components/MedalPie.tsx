"use client";

import { useEffect, useRef } from "react";

const STORAGE = "nadrazky:medal:";

/** What this browser last showed of a badge: its level and how much was in colour. */
function lastShown(key: string): { level: number; fill: number } | null {
  try {
    const [level, fill] = (localStorage.getItem(STORAGE + key) ?? "").split(":").map(Number);
    return Number.isFinite(level) && Number.isFinite(fill) ? { level, fill } : null;
  } catch {
    return null;
  }
}

function remember(key: string, level: number, fill: number) {
  try {
    localStorage.setItem(STORAGE + key, `${level}:${fill}`);
  } catch {
    // Private windows and blocked storage: the pie just doesn't rise next time.
  }
}

/**
 * The coloured part of a badge, cut to a pie slice of `fill` (0–1). When it has grown since
 * this browser last showed it (`rememberAs`, the badge's key), or `from` is given, the slice
 * rises from there to `fill`. A new level rises from nothing.
 */
export function MedalPie({
  fill,
  level,
  rememberAs,
  from,
  children,
}: {
  fill: number;
  level: number;
  rememberAs?: string;
  /** Where to rise from instead of what was last shown, e.g. 0 to sweep all the way round. */
  from?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Where to rise from, worked out once per value: development runs effects twice, and the
  // second run would otherwise read back what the first one remembered.
  const plan = useRef<{ fill: number; level: number; start: number | null } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (plan.current?.fill !== fill || plan.current.level !== level) {
      const last = rememberAs ? lastShown(rememberAs) : null;
      // Badges not started yet have nothing to rise from.
      if (rememberAs && (level > 0 || fill > 0)) remember(rememberAs, level, fill);
      plan.current = { fill, level, start: from ?? (last ? (last.level < level ? 0 : last.fill) : null) };
    }
    const { start } = plan.current;
    if (start === null || start >= fill || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Jump back to where it was, then let the transition carry it to where it is now.
    el.removeAttribute("data-rising");
    el.style.setProperty("--medal-fill", `${start * 360}deg`);
    el.getBoundingClientRect();
    const frame = requestAnimationFrame(() => {
      el.setAttribute("data-rising", "");
      el.style.setProperty("--medal-fill", `${fill * 360}deg`);
    });
    return () => cancelAnimationFrame(frame);
  }, [fill, level, rememberAs, from]);

  return (
    <div ref={ref} className="medal-fill absolute inset-0" style={{ "--medal-fill": `${fill * 360}deg` } as React.CSSProperties}>
      {children}
    </div>
  );
}
