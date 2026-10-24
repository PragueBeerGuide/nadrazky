"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PIN } from "@/lib/map";
import { fold } from "@/lib/slug";
import type { PubKind, PubStatus } from "@/lib/queries";
import { Ago, useAgo } from "./Ago";
import { PubMap, type MapStation } from "./PubMap";
import { compareLastConfirmed } from "@/lib/ago";

export type MapPub = {
  slug: string;
  name: string;
  station: string;
  stationId: number;
  status: PubStatus;
  kind: PubKind;
  lines: string[];
  monthsAgo: number | null;
  lastConfirmedAt: string | null;
  lat: number;
  lon: number;
};

const RANK: Record<PubStatus, number> = { open: 0, unknown: 1, closed: 2 };
const STATUSES: PubStatus[] = ["open", "unknown", "closed"];

/** The map page: filters and results beside the map on a computer, floating over it on a phone. */
export function MapExplorer({
  pubs,
  lines,
  initialLine = "",
  initialPub,
  locate = false,
}: {
  pubs: MapPub[];
  lines: { number: string; name: string }[];
  initialLine?: string;
  initialPub?: string;
  locate?: boolean;
}) {
  const t = useTranslations("map");
  const pt = useTranslations("pubs");
  const lt = useTranslations("lines");
  const st = useTranslations("statusShort");
  const kt = useTranslations("kind");

  const [q, setQ] = useState("");
  const [line, setLine] = useState(lines.some((l) => l.number === initialLine) ? initialLine : "");
  const [off, setOff] = useState<Set<PubStatus>>(new Set());
  const [selected, setSelected] = useState<number | null>(
    () => pubs.find((p) => p.slug === initialPub)?.stationId ?? null,
  );
  const query = useDeferredValue(q);

  // Search and line narrow the pubs; status toggles are counted on top of that.
  const matching = useMemo(() => {
    const term = fold(query.trim());
    return pubs.filter(
      (p) =>
        (!line || p.lines.includes(line)) &&
        (term.length < 2 || fold(p.name).includes(term) || fold(p.station).includes(term)),
    );
  }, [pubs, line, query]);
  const counts = useMemo(() => {
    const c: Record<PubStatus, number> = { open: 0, unknown: 0, closed: 0 };
    for (const p of matching) c[p.status]++;
    return c;
  }, [matching]);
  const visible = useMemo(
    () =>
      matching
        .filter((p) => !off.has(p.status))
        .sort((a, b) => RANK[a.status] - RANK[b.status] || compareLastConfirmed(a, b)),
    [matching, off],
  );
  const stations = useMemo(() => {
    const byId = new Map<number, MapStation>();
    for (const p of visible) {
      const s = byId.get(p.stationId);
      if (s) s.pubs.push(p);
      else byId.set(p.stationId, { id: p.stationId, name: p.station, lat: p.lat, lon: p.lon, best: p.status, pubs: [p] });
    }
    for (const s of byId.values()) s.best = s.pubs[0].status;
    return [...byId.values()];
  }, [visible]);
  const selectedStation = useMemo(() => {
    const station = stations.find((s) => s.id === selected);
    if (!station) return null;
    // A pub opened from its own page ("Open on the big map") leads its station's list.
    const i = station.pubs.findIndex((p) => p.slug === initialPub);
    return i > 0 ? { ...station, pubs: [station.pubs[i], ...station.pubs.slice(0, i), ...station.pubs.slice(i + 1)] } : station;
  }, [stations, selected, initialPub]);
  const shownStatuses = STATUSES.filter((s) => s !== "closed" || counts.closed > 0);

  const toggle = (s: PubStatus) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const statusButtons = (compact: boolean) =>
    shownStatuses.map((s) => {
      const on = !off.has(s);
      return (
        <button
          key={s}
          type="button"
          aria-pressed={on}
          onClick={() => toggle(s)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border text-sm font-semibold ${
            compact ? "h-[38px] px-3" : "h-10 px-3.5"
          } ${on ? `chip-${s} border-current` : "border-field bg-white text-muted line-through decoration-1"}`}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN[s] }} />
          {st(s)}
          {!compact && <span className="font-mono text-xs no-underline">· {counts[s]}</span>}
        </button>
      );
    });

  return (
    <div className="flex h-[calc(100dvh-64px-72px)] md:h-[calc(100dvh-74px)]">
      <aside
        aria-label={t("filters")}
        className="hidden w-[400px] shrink-0 flex-col border-r border-rule bg-white md:flex lg:w-[440px]"
      >
        <div className="flex flex-col gap-4 border-b border-rule px-6 pt-6 pb-4">
          <h1 className="text-[38px]">{t("title")}</h1>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="map-search" className="text-sm font-medium">
              {pt("searchLabel")}
            </label>
            <input
              id="map-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={pt("searchPlaceholder")}
              className="field"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="map-line" className="text-sm font-medium">
              {pt("line")}
            </label>
            <select id="map-line" value={line} onChange={(e) => setLine(e.target.value)} className="field">
              <option value="">{pt("anyLine")}</option>
              {lines.map((l) => (
                <option key={l.number} value={l.number}>
                  {l.number} · {l.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{pt("status")}</legend>
            <div className="flex flex-wrap gap-2">{statusButtons(false)}</div>
          </fieldset>
        </div>
        <div className="flex items-baseline justify-between border-b border-rule-soft px-6 py-3 text-sm text-muted">
          <span>
            <strong className="text-ink">{pt("results", { count: visible.length })}</strong>
            {line && <> {t("onLine", { number: line })}</>}
          </span>
          <span>{t("openFirst")}</span>
        </div>
        {visible.length ? (
          <ul className="flex flex-1 flex-col gap-0.5 overflow-auto px-3 pt-2 pb-4">
            {visible.map((p) => {
              const sel = p.stationId === selected;
              return (
                <li key={p.slug}>
                  <Link
                    href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }}
                    className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${
                      sel ? "bg-sign-tint shadow-[inset_0_0_0_2px_var(--sign)]" : "hover:bg-platform"
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: PIN[p.status], boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${PIN[p.status]}` }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{p.name}</span>
                      <span className="truncate text-[13px] text-muted">
                        {p.station} · {kt(p.kind)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      <Ago months={p.monthsAgo} date={p.lastConfirmedAt} short />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 py-6 text-muted">{t("empty")}</p>
        )}
      </aside>

      <section aria-label={t("mapLabel")} className="relative min-w-0 flex-1 bg-[#e8ebe3]">
        <h1 className="sr-only md:hidden">{t("title")}</h1>
        <PubMap
          stations={stations}
          selected={selectedStation}
          onSelect={setSelected}
          fitKey={line}
          locate={locate}
          popup={selectedStation && <StationPopup station={selectedStation} />}
        />

        {/* Phone: search and filters float over the map */}
        <div className="absolute inset-x-3 top-3.5 flex flex-col gap-2.5 md:hidden">
          <div className="flex items-center gap-1 rounded-xl bg-white py-1 pr-1 pl-3.5 shadow-[0_4px_14px_rgb(14_26_43/0.18)]">
            <label htmlFor="map-search-m" className="sr-only">
              {pt("searchLabel")}
            </label>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6" />
              <path d="m20 20-4.5-4.5" />
            </svg>
            <input
              id="map-search-m"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={pt("searchPlaceholder")}
              className="h-11 min-w-0 flex-1 bg-transparent px-1.5 text-base outline-none"
            />
          </div>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            <label className="relative inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-sign pr-3 pl-1.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgb(14_26_43/0.18)]">
              <span className="line-chip rounded-full text-xs">{line || "—"}</span>
              {pt("line")}
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={pt("line")}
              >
                <option value="">{pt("anyLine")}</option>
                {lines.map((l) => (
                  <option key={l.number} value={l.number}>
                    {l.number} · {l.name}
                  </option>
                ))}
              </select>
            </label>
            {statusButtons(true)}
          </div>
        </div>

        {/* Computer: legend */}
        <div className="absolute bottom-4 left-4 hidden flex-wrap gap-x-4 gap-y-2 rounded-[10px] bg-white px-3.5 py-2.5 text-[13px] font-medium shadow-[0_2px_8px_rgb(14_26_43/0.18)] md:flex">
          {shownStatuses.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: PIN[s] }} />
              {st(s)}
            </span>
          ))}
          {line && (
            <span className="inline-flex items-center gap-1.5">
              <span className="line-chip text-xs">{line}</span>
              {lt("line", { number: line })}
            </span>
          )}
        </div>

        {/* Phone: the selected station as a bottom sheet */}
        {selectedStation && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[55%] flex-col gap-3 overflow-auto rounded-t-[20px] bg-white px-4 pt-2 pb-4 shadow-[0_-8px_24px_rgb(14_26_43/0.18)] md:hidden">
            <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-rule" />
            <StationSheet station={selectedStation} onClose={() => setSelected(null)} />
          </div>
        )}
      </section>
    </div>
  );
}

function directions(s: { lat: number; lon: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
}

/** Popup over the selected pin (computer). */
function StationPopup({ station }: { station: MapStation }) {
  const t = useTranslations("map");
  const st = useTranslations("status");
  const kt = useTranslations("kind");
  const pt = useTranslations("pub");
  const ago = useAgo();
  const [first, ...rest] = station.pubs;
  return (
    <div className="flex w-[268px] flex-col gap-2.5 text-ink">
      <div className="flex flex-col pr-8">
        <span className="font-display text-[26px] leading-[1.05] font-bold">{station.name}</span>
        <span className="text-[13px] text-muted">{t("pubsHere", { count: station.pubs.length })}</span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-rule-soft pt-2.5">
        <span className="text-base font-semibold">{first.name}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={`chip chip-${first.status}`}>{st(first.status)}</span>
          <span className="text-[13px] text-muted">
            {kt(first.kind)} · {t("confirmed", { when: ago(first.monthsAgo, false, first.lastConfirmedAt) })}
          </span>
        </span>
        {rest.length > 0 && (
          <span className="text-sm text-muted">
            {t("alsoHere")}{" "}
            {rest.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }} className="link font-medium">
                  {p.name}
                </Link>
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Link
          href={{ pathname: "/pub/[slug]", params: { slug: first.slug } }}
          className="btn btn-sign h-11 min-h-0 flex-1 px-3 text-[15px] text-white"
        >
          {t("detail")}
        </Link>
        <a href={directions(station)} className="btn btn-outline h-11 min-h-0 px-3.5 text-[15px]">
          {pt("navigate")}
        </a>
      </div>
    </div>
  );
}

/** Bottom sheet for the selected station (phone). */
function StationSheet({ station, onClose }: { station: MapStation; onClose: () => void }) {
  const t = useTranslations("map");
  const kt = useTranslations("kind");
  const lines = [...new Set(station.pubs.flatMap((p) => p.lines))].slice(0, 2);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex min-w-0 rounded-[6px] bg-white p-[3px] shadow-[0_0_0_1px_var(--rule)]">
            <span className="truncate rounded-[4px] border-2 border-sign px-3 font-display text-[28px] leading-9 font-bold text-sign">
              {station.name}
            </span>
          </span>
          {lines.map((n) => (
            <span key={n} className="line-chip">
              {n}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-platform"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <span className="text-[13px] text-muted">{t("pubsHere", { count: station.pubs.length })}</span>
      <ul className="flex flex-col">
        {station.pubs.map((p, i) => (
          <li key={p.slug} className={i ? "border-t border-rule-soft" : ""}>
            <Link href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }} className="flex items-center gap-3 py-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PIN[p.status] }} />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-semibold">{p.name}</span>
                <span className="text-[13px] text-muted">
                  {kt(p.kind)} · <Ago months={p.monthsAgo} date={p.lastConfirmedAt} />
                </span>
              </span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
