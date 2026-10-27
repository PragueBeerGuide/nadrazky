import { LocateFixedIcon, MapIcon, SearchIcon } from "lucide-react";
import { asLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { DepartureBoard } from "@/components/DepartureBoard";
import { LineChip } from "@/components/LineChip";
import { RailTrack } from "@/components/RailTrack";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getTotals, listLines, listPubs, listRegions } from "@/lib/queries";
import { compareLastConfirmed } from "@/lib/ago";
import { Progress } from "@/components/ui/progress";
import { BadgeMedal } from "@/components/BadgeMedal";
import { medalRegionName } from "@/components/badgeText";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const pt = await getTranslations("pubs");
  const lt = await getTranslations("lines");
  const [totals, regions, lines, open] = await Promise.all([
    getTotals(),
    listRegions(locale),
    listLines(),
    listPubs({ status: ["open"] }),
  ]);
  const board = [...open].sort(compareLastConfirmed).slice(0, 7);
  const topLines = [...lines].sort((a, b) => b.pubCount - a.pubCount).slice(0, 8);
  const byCount = [...regions].sort((a, b) => b.pubCount - a.pubCount);
  const maxRegion = byCount[0]?.pubCount || 1;
  const isCs = locale === "cs";
  const openAllHref = { pathname: "/pubs", query: { status: "open" } } as const;

  const stats = [
    ["pubs", totals.pubs, "text-sign"],
    ["stations", totals.stations, "text-sign"],
    ["open", totals.open, "text-[#1e7a46]"],
    ["waiting", totals.unknown, "text-sign"],
  ] as const;

  return (
    <>
      <section className="bg-sign text-white">
        <div className="page-column grid items-center gap-8 pt-6 pb-8 md:gap-12 md:pt-14 md:pb-[72px] lg:grid-cols-2">
          <div className="flex flex-col gap-4 md:gap-6">
            <p className="eyebrow text-xs md:text-[13px]">{t("eyebrow")}</p>
            <h1 className="text-[52px] leading-[0.92] tracking-[-0.01em] md:text-[clamp(56px,8vw,104px)]">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </h1>
            <p className="hidden max-w-[34ch] text-xl text-sign-mist md:block">{t("lead")}</p>
            <form
              role="search"
              action={getPathname({ href: "/pubs", locale })}
              className="flex max-w-[520px] flex-col gap-1.5 md:gap-2"
            >
              <Label htmlFor="home-search">{pt("searchLabel")}</Label>
              <InputGroup className="h-auto gap-1 rounded-lg border-0 bg-white p-1 has-[[data-slot=input-group-control]:focus-visible]:ring-yellow md:gap-1.5 md:p-1.5">
                <InputGroupInput
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder={pt("searchPlaceholder")}
                  className="h-11 px-2.5 text-ink md:h-12 md:px-3 md:text-[17px]"
                />
                <Button type="submit" variant="ink" size="xl" className="h-11 px-3 md:h-12 md:px-5" aria-label={pt("search")}>
                  <SearchIcon className="size-5 md:hidden" />
                  <span className="hidden md:inline">{pt("search")}</span>
                </Button>
              </InputGroup>
            </form>
            <div className="flex flex-wrap gap-3">
              <Link href={{ pathname: "/map", query: { near: "1" } }} className={cn(buttonVariants({ variant: "yellow", size: "xl" }), "w-full md:hidden")}>
                <LocateFixedIcon className="size-5" />
                {t("nearMe")}
              </Link>
              <Link href="/map" className={cn(buttonVariants({ variant: "yellow", size: "xl" }), "hidden h-13 font-semibold md:inline-flex")}>
                <MapIcon className="size-5" />
                {t("openMap")}
              </Link>
              <Link href="/pubs" className={cn(buttonVariants({ variant: "ghost-dark", size: "xl" }), "hidden h-13 md:inline-flex")}>
                {t("browseAll", { count: totals.pubs })}
              </Link>
            </div>
          </div>

          <DepartureBoard
            pubs={board}
            title={t("boardTitle")}
            className="hidden md:block"
            meta={<span className="font-mono text-xs text-board-muted">{t("boardCount", { open: totals.open, total: totals.pubs })}</span>}
            footer={
              <Link href={openAllHref} className="text-[15px] font-semibold text-yellow hover:underline">
                {t("boardAll")}
              </Link>
            }
          />
        </div>
        <RailTrack />
      </section>

      <div className="page-column pt-6 md:hidden">
        <DepartureBoard
          pubs={board.slice(0, 4)}
          title={t("boardTitle")}
          meta={
            <Link href={openAllHref} className="text-sm font-semibold text-yellow">
              {t("boardAllShort", { count: totals.open })}
            </Link>
          }
        />
      </div>

      <section aria-label={t("statsTitle")} className="mt-8 border-y border-rule bg-white py-6 md:mt-0 md:border-t-0 md:py-10">
        <dl className="page-column grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          {stats.map(([key, n, color]) => (
            <div key={key} className="flex flex-col-reverse gap-1">
              <dt className="text-sm text-muted-foreground md:text-base">{t(`stats.${key}`, { count: n })}</dt>
              <dd className={`font-display text-5xl leading-none font-bold md:text-[64px] ${color}`}>{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pt-8 pb-4 md:pt-16 md:pb-6">
        <div className="page-column flex flex-col gap-4 md:gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[30px] md:text-5xl">{t("byLine")}</h2>
            <Link href="/lines" className="link text-sm md:text-base">
              {t("allLines")}
            </Link>
          </div>
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:gap-4 md:overflow-visible md:px-0">
            {topLines.map((l) => (
              <li key={l.number} className="w-[220px] shrink-0 snap-start md:w-auto">
                <Card
                  render={<Link href={{ pathname: "/line/[number]", params: { number: l.number } }} />}
                  className="h-full gap-2.5 p-3.5 hover:border-sign md:gap-3.5 md:p-5"
                >
                  <span className="flex items-center justify-between">
                    <LineChip number={l.number} size="lg" className="max-md:px-2.5 max-md:text-lg" />
                    <span className="font-mono text-xs text-muted-foreground md:text-[13px]">{lt("pubCount", { count: l.pubCount })}</span>
                  </span>
                  <span className="text-[15px] leading-snug font-semibold md:text-[17px]">{l.name}</span>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pt-8 pb-10 md:pt-12 md:pb-16">
        <div className="page-column flex flex-col gap-4 md:gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[30px] md:text-5xl">{t("byRegion")}</h2>
            <Link href="/regions" className="link text-sm md:text-base">
              {t("allRegions")}
            </Link>
          </div>
          <ul className="divide-y divide-rule-soft overflow-hidden rounded-xl border bg-card md:grid md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:gap-3 md:divide-y-0 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
            {byCount.map((r) => (
              <li key={r.slug}>
                <Card
                  render={<Link href={{ pathname: "/region/[slug]", params: { slug: r.slug } }} />}
                  className="gap-2 rounded-none border-0 px-4 py-3 hover:bg-sign-tint md:gap-2.5 md:rounded-lg md:border md:px-4.5 md:py-4 md:hover:border-sign md:hover:bg-card"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{isCs ? r.nameCs : r.nameEn}</span>
                    <span className="font-mono text-[15px] font-semibold text-sign">{r.pubCount}</span>
                  </span>
                  <Progress value={Math.round((r.pubCount / maxRegion) * 100)} aria-hidden="true" className="[&_[data-slot=progress-track]]:h-1.5" />
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HelpBand
        waiting={totals.unknown}
        topLine={topLines[0]}
        topRegion={byCount[0] ? { name: isCs ? byCount[0].nameCs : byCount[0].nameEn, count: byCount[0].pubCount } : undefined}
      />
    </>
  );
}

async function HelpBand({
  waiting,
  topLine,
  topRegion,
}: {
  waiting: number;
  topLine?: { number: string; pubCount: number };
  topRegion?: { name: string; count: number };
}) {
  const t = await getTranslations("home");
  const bt = await getTranslations("badges");
  const steps = [t("step1"), t("step2"), t("step3")];
  return (
    <section className="bg-yellow py-10 text-ink md:py-16">
      <div className="page-column grid items-center gap-10 md:gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h2 className="text-[40px] leading-[0.95] md:text-[56px]">{t("helpTitle")}</h2>
          <p className="max-w-[40ch] text-lg md:text-[19px]">
            {t("helpText")} {t("helpWaiting", { count: waiting })}
          </p>
          <ol className="flex flex-col gap-3.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono font-semibold text-yellow">
                  {i + 1}
                </span>
                <span className="pt-1 text-[17px]">{s}</span>
              </li>
            ))}
          </ol>
          <Link href="/badges" className="link self-start text-[15px] font-semibold max-md:self-center">
            {bt("homeLink")}
          </Link>
          <div className="max-md:text-center">
            <Link href={{ pathname: "/pubs", query: { status: "unknown" } }} className={cn(buttonVariants({ variant: "ink", size: "xl" }), "h-13")}>
              {t("helpCta")}
            </Link>
          </div>
        </div>
        <ul aria-label={t("badgesAlt")} className="flex flex-wrap justify-center gap-x-4 gap-y-5 md:gap-6">
          <li>
            <BadgeMedal kind="pubs" label={bt("kind.pubs")} title={bt("pubsName")} level={3} complete={false} fill={0.6} levelLabel={`${bt("pubsName")}: ${bt("level", { level: 3 })}`} size="lg" />
          </li>
          {topLine && (
            <li>
              <BadgeMedal
                kind="line"
                label={bt("kind.line")}
                title={topLine.number}
                level={2}
                complete={false}
                fill={0.4}
                levelLabel={`${bt("lineName", { number: topLine.number })}: ${bt("level", { level: 2 })}`}
                size="lg"
              />
            </li>
          )}
          {topRegion && (
            <li>
              <BadgeMedal kind="region" label={bt("kind.region")} title={medalRegionName(topRegion.name)} level={1} complete levelLabel={`${topRegion.name}: ${bt("complete")}`} size="lg" />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
