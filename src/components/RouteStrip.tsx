import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { LineRoute } from "@/lib/lineOrder";
import type { LineStop } from "@/lib/queries";

const dot = { open: "bg-open", unknown: "bg-white", closed: "bg-white" } as const;
const ink = { open: "text-open-ink", unknown: "text-muted-foreground", closed: "text-closed-ink" } as const;

/** Horizontal route strip: the stops either side of this station along the line. */
export async function RouteStrip({ route, stationId }: { route: LineRoute<LineStop>; stationId: number }) {
  const t = await getTranslations("pub");
  const sum = await getTranslations("summary");
  const branch = route.branches.find((b) => b.stops.some((s) => s.stationId === stationId));
  const seq = branch ? [branch.from, ...branch.stops] : route.main;
  const at = seq.findIndex((s) => s.stationId === stationId);
  if (at < 0 || seq.length < 2) return null;
  const from = Math.max(0, Math.min(at - 2, seq.length - 5));
  const stops = seq.slice(from, from + 5);
  const nearCount = stops.filter((_, i) => Math.abs(from + i - at) <= 1).length;

  return (
    <Card className="block px-3 pt-6 pb-5 md:px-6 md:pt-7 md:pb-6">
      <ol
        className="grid grid-cols-[repeat(var(--cols-phone),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={{ "--cols": stops.length, "--cols-phone": nearCount } as React.CSSProperties}
      >
        {stops.map((s, i) => {
          const here = s.stationId === stationId;
          const near = Math.abs(from + i - at) <= 1;
          const count = s.pubs.filter((p) => p.status === s.best).length;
          return (
            <li
              key={s.stationId}
              aria-current={here ? "location" : undefined}
              className={`relative flex-col items-center gap-2 text-center md:flex ${near ? "flex" : "hidden"}`}
            >
              {i < stops.length - 1 && (
                <span aria-hidden="true" className="absolute top-[9px] right-[-50%] left-1/2 h-1 bg-sign md:top-2.5" />
              )}
              {here ? (
                <span className="relative -mt-1.5 h-8 w-8 rounded-full border-4 border-sign bg-yellow md:h-9 md:w-9" />
              ) : (
                <span className={`relative h-[22px] w-[22px] rounded-full border-4 border-sign md:h-6 md:w-6 ${dot[s.best]}`} />
              )}
              {here ? (
                <span className="font-display text-xl leading-none font-bold md:text-2xl">{s.station}</span>
              ) : (
                <Link
                  href={{ pathname: "/pub/[slug]", params: { slug: s.pubs[0].slug } }}
                  className="px-1 text-[13px] leading-tight font-semibold hover:text-sign hover:underline md:text-[15px]"
                >
                  {s.station}
                </Link>
              )}
              <span className={`hidden px-1 text-[13px] font-semibold md:block ${ink[s.best]}`}>
                {sum(s.best, { count })}
                {here && ` · ${t("youAreHere")}`}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
