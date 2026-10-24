import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LineChip } from "@/components/LineChip";
import { RailTrack } from "@/components/RailTrack";
import { StatusChip } from "@/components/StatusChip";
import { routeStops } from "@/lib/lineOrder";
import { getLine, getLineStops, type LineStop } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/line/[number]">): Promise<Metadata> {
  const { number } = await params;
  const line = await getLine(number);
  return line ? { title: `${line.number} ${line.nameCs}` } : {};
}

const dot = { open: "bg-open", unknown: "bg-white", closed: "bg-white" } as const;

export default async function LinePage({ params }: PageProps<"/[locale]/line/[number]">) {
  const { locale, number } = await params;
  setRequestLocale(asLocale(locale));
  const line = await getLine(number);
  if (!line) notFound();
  const t = await getTranslations("lines");
  const nav = await getTranslations("nav");
  const route = await getLineStops(line.number, line.nameCs);
  const stops = routeStops(route);
  const pubs = stops.flatMap((s) => s.pubs);
  const count = (status: string) => pubs.filter((p) => p.status === status).length;
  const first = route.main[0];
  const last = route.main.at(-1);

  const stats = [
    [t("statPubs"), pubs.length, ""],
    [t("statStations"), stops.length, ""],
    [t("statOpen"), count("open"), "text-open-board"],
    [t("statWaiting"), count("unknown"), ""],
  ] as const;

  return (
    <>
      <section className="bg-sign px-4 pt-4 pb-8 text-white md:px-6 md:pt-6 md:pb-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-7">
          <nav aria-label={nav("breadcrumb")} className="text-sm text-[#b9c6e2]">
            <Link href="/lines" className="text-sign-mist underline underline-offset-2">
              {t("title")}
            </Link>{" "}
            <span aria-hidden="true">/</span> <span aria-current="page">{t("line", { number: line.number })}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-5 md:gap-7">
            <LineChip number={line.number} size="xl" />
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
              <p className="eyebrow">{t("eyebrow")}</p>
              <h1 className="text-[40px] md:text-[56px]">{line.nameCs}</h1>
            </div>
          </div>
          <dl className="flex flex-wrap gap-2.5 md:gap-3">
            {stats.map(([label, n, color]) => (
              <div key={label} className="flex flex-col rounded-[10px] bg-sign-deep px-4 py-2.5 md:px-[18px] md:py-3">
                <dt className="text-[13px] text-[#b9c6e2]">{label}</dt>
                <dd className={`font-display text-[34px] leading-[1.1] font-bold ${color}`}>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <RailTrack />

      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-6 px-4 pt-8 pb-12 md:gap-8 md:px-6 md:pt-12 md:pb-16">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[32px] md:text-4xl">{t("stopByStop")}</h2>
              {first && last && first !== last && (
                <span className="text-[15px] text-muted">{t("direction", { from: first.station, to: last.station })}</span>
              )}
            </div>
            <p className="text-sm text-muted">{t("orderNote")}</p>
          </div>
          <Stops stops={route.main} branchAt={new Set(route.branches.map((b) => b.from.stationId))} />
          {route.branches.map((b) => (
            <section key={b.from.stationId} className="flex flex-col gap-4">
              <h3 className="mt-4 text-[28px]">{t("branch", { from: b.from.station })}</h3>
              <Stops stops={b.stops} branchAt={new Set()} />
            </section>
          ))}
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <div className="card flex flex-col items-center gap-4 p-6 text-center">
            <div aria-hidden="true" className="flex h-[132px] w-[132px] items-center justify-center rounded-full bg-rule-soft">
              <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full border-[3px] border-dashed border-unknown bg-white">
                <span className="font-mono text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">{t("eyebrow")}</span>
                <span className="font-display text-[38px] leading-none font-bold text-muted">{line.number}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-[28px]">{t("badgeTitle", { number: line.number })}</h2>
              <p className="text-[15px] text-muted">{t("badgeText", { count: stops.length })}</p>
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <span className="block h-2.5 rounded-full bg-rule-soft" />
              <span className="font-mono text-[13px] text-muted">{t("badgeProgress", { count: stops.length })}</span>
            </div>
            <span className="w-full rounded-[10px] bg-sign-tint px-4 py-3 font-mono text-xs font-semibold tracking-[0.08em] text-sign uppercase">
              {t("badgesSoon")}
            </span>
          </div>
          <div className="card flex flex-col gap-3 p-5">
            <span className="label">{t("legendTitle")}</span>
            {(
              [
                ["bg-open", t("legendOpen")],
                ["bg-white", t("legendNone")],
              ] as const
            ).map(([bg, label]) => (
              <span key={label} className="flex items-center gap-2.5 text-[15px]">
                <span className={`h-5 w-5 rounded-full border-4 border-sign ${bg}`} />
                {label}
              </span>
            ))}
            <Link href={{ pathname: "/map", query: { line: line.number } }} className="link text-[15px]">
              {t("onMap", { number: line.number })}
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

async function Stops({ stops, branchAt }: { stops: LineStop[]; branchAt: Set<number> }) {
  const t = await getTranslations("lines");
  const kt = await getTranslations("kind");
  return (
    <ol className="card px-4 py-3 md:px-6">
      {stops.map((s, i) => (
        <li key={s.stationId} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 md:grid-cols-[40px_minmax(0,1fr)] md:gap-x-4">
          <span aria-hidden="true" className="relative flex justify-center">
            <span
              className={`absolute w-1.5 bg-sign ${i === 0 ? "top-[30px]" : "top-0"} ${i === stops.length - 1 ? "h-[30px]" : "bottom-0"}`}
            />
            <span className={`relative mt-[18px] h-6 w-6 rounded-full border-[5px] border-sign ${dot[s.best]}`} />
          </span>
          <div className={`flex flex-col gap-2.5 pt-3.5 pb-[18px] ${i === stops.length - 1 ? "" : "border-b border-rule-soft"}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <h3 className="text-2xl leading-[1.1] md:text-[28px]">{s.station}</h3>
              {branchAt.has(s.stationId) && (
                <span className="rounded-[4px] bg-sign-tint px-2 py-0.5 font-mono text-xs font-semibold text-sign">{t("branchTag")}</span>
              )}
            </div>
            <ul className="flex flex-wrap gap-2">
              {s.pubs.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }}
                    className="inline-flex items-center gap-2.5 rounded-[10px] border border-rule bg-white py-2 pr-3.5 pl-2.5 hover:border-sign"
                  >
                    <StatusChip status={p.status} className="text-xs" />
                    <span className="flex flex-col leading-tight">
                      <span className="text-[15px] font-semibold">{p.name}</span>
                      <span className="text-[13px] text-muted">{kt(p.kind)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
