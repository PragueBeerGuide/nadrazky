import { CheckIcon, MapPinCheckInsideIcon } from "lucide-react";
import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Ago } from "@/components/Ago";
import { LineChip } from "@/components/LineChip";
import { PubMiniMap } from "@/components/PubMiniMap";
import { RailTrack } from "@/components/RailTrack";
import { RouteStrip } from "@/components/RouteStrip";
import { StationSign } from "@/components/StationSign";
import { StatusChip } from "@/components/StatusChip";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { canDeletePubs, canEditRailData } from "@/lib/auth/roles";
import { getCheckInSummary, hasCheckedInToday, listRecentCheckIns } from "@/lib/checkins";
import { avatarUrl } from "@/lib/profile";
import { Avatar } from "@/components/Avatar";
import { getLineStops, getPub } from "@/lib/queries";
import { DeletePubButton } from "@/components/DeletePubButton";

// Breadcrumbs on the sign-blue band
const crumbs = {
  list: "gap-x-1.5 gap-y-0 text-[#b9c6e2]",
  link: "text-sign-mist underline underline-offset-2 hover:text-white",
  page: "text-[inherit]",
};
const outlineBtn = "h-11.5 px-3 text-[15px]";

export async function generateMetadata({ params }: PageProps<"/[locale]/pub/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPub(slug);
  return data ? { title: `${data.pub.name} — ${data.station.name}` } : {};
}

export default async function PubPage({ params }: PageProps<"/[locale]/pub/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const data = await getPub(slug);
  if (!data) notFound();
  const { pub, station, region, lines, neighbours, confirmedMonthsAgo } = data;
  const t = await getTranslations("pub");
  const nav = await getTranslations("nav");
  const kt = await getTranslations("kind");
  const isCs = locale === "cs";
  const lat = pub.lat ?? station.lat;
  const lon = pub.lon ?? station.lon;
  const mainLine = lines[0];
  const route = mainLine ? await getLineStops(mainLine.number, mainLine.name) : null;
  const description = isCs ? pub.descriptionCs : (pub.descriptionEn ?? pub.descriptionCs);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const regionName = region ? (isCs ? region.nameCs : region.nameEn) : null;
  const ct = await getTranslations("checkIn");
  const rt = await getTranslations("report");
  const format = await getFormatter();
  const user = await getCurrentUser();
  const admin = canEditRailData(user?.role);
  const at = await getTranslations("admin");
  const [summary, recent, checkedInToday] = await Promise.all([
    getCheckInSummary(pub.id),
    listRecentCheckIns(pub.id),
    user ? hasCheckedInToday(user.id, pub.id) : false,
  ]);
  const now = new Date();
  const checkInHref = { pathname: "/pub/[slug]/check-in", params: { slug: pub.slug } } as const;

  const facts: [string, React.ReactNode][] = [
    [t("station"), station.name],
    ...(region
      ? [
          [
            t("region"),
            <Link key="r" href={{ pathname: "/region/[slug]", params: { slug: region.slug } }} className="link font-medium">
              {regionName}
            </Link>,
          ] as [string, React.ReactNode],
        ]
      : []),
    [t("type"), kt(pub.kind)],
    ...(lines.length || admin
      ? [
          [
            t("lines"),
            <span key="l" className="flex flex-col gap-1.5">
              {lines.map((l) => (
                <span key={l.number} className="flex items-center gap-2">
                  <LineChip number={l.number} />
                  <Link href={{ pathname: "/line/[number]", params: { number: l.number } }} className="link font-medium">
                    {l.name}
                  </Link>
                </span>
              ))}
              {admin && (
                <Link href={{ pathname: "/admin/station/[slug]", params: { slug: station.slug } }} className="link text-sm">
                  {at("editLines")}
                </Link>
              )}
            </span>,
          ] as [string, React.ReactNode],
        ]
      : []),
    [t("lastConfirmed"), <Ago key="a" months={confirmedMonthsAgo} date={pub.lastConfirmedAt} />],
    [
      t("openingHours"),
      pub.openingHours ?? (
        <span key="o" className="text-muted-foreground">
          {t("notKnownYet")}
        </span>
      ),
    ],
    ...(pub.address ? [[t("address"), pub.address] as [string, React.ReactNode]] : []),
    ...(pub.beers ? [[t("beers"), pub.beers] as [string, React.ReactNode]] : []),
  ];

  return (
    <article>
      <section className="bg-sign pt-4 pb-7 text-white md:pt-6 md:pb-14">
        <div className="page-column flex flex-col gap-6 md:gap-8">
          <Breadcrumb aria-label={nav("breadcrumb")}>
            <BreadcrumbList className={crumbs.list}>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/pubs" />} className={crumbs.link}>
                  {nav("pubs")}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {region && (
                <>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={{ pathname: "/region/[slug]", params: { slug: region.slug } }} />} className={crumbs.link}>
                      {regionName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className={crumbs.page}>{station.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-end justify-between gap-6 md:gap-10">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4 md:gap-5">
              <StationSign name={station.name} size="lg" className="self-start" />
              <h1 className="text-[40px] md:text-[60px]">{pub.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={pub.status} className="md:px-3.5 md:py-1 md:text-[15px]" />
                <Badge variant="outline" className="h-auto border-sign-line px-3 py-0.5 text-sm font-normal text-white md:px-3.5 md:text-[15px]">
                  {kt(pub.kind)}
                </Badge>
                {lines.slice(0, 2).map((l) => (
                  <Badge
                    key={l.number}
                    variant="outline"
                    render={<Link href={{ pathname: "/line/[number]", params: { number: l.number } }} />}
                    className="h-auto max-w-full gap-2 border-sign-line py-0.5 pr-3.5 pl-1 text-sm max-sm:border-transparent max-sm:p-0 font-normal text-white [a]:hover:bg-sign-deep [a]:hover:text-white md:text-[15px]"
                  >
                    <LineChip number={l.number} className="rounded-full" />
                    <span className="hidden truncate sm:inline">{l.name}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="w-full gap-3.5 rounded-2xl border-0 p-5 shadow-[0_16px_40px_rgb(5_12_28/0.3)] md:w-auto md:flex-[0_1_400px] md:p-6">
              <h2 className="text-[30px]">{t("checkInTitle")}</h2>
              <p className="text-[15px] text-muted-foreground">{t("checkInText")}</p>
              {checkedInToday ? (
                <p className="flex h-14 items-center justify-center gap-2.5 rounded-xl bg-open-bg text-lg font-semibold text-open-ink">
                  <CheckIcon strokeWidth={2.4} className="size-5.5" />
                  {t("checkedInToday")}
                </p>
              ) : (
                // Signed out, the check-in page sends the user to log in and back.
                <Link href={checkInHref} className={cn(buttonVariants({ variant: "yellow", size: "xl" }), "h-14 rounded-xl text-lg")}>
                  <MapPinCheckInsideIcon strokeWidth={2.2} className="size-5.5" />
                  {!user ? t("checkInLogin") : signUpFinished(user) ? t("checkIn") : t("checkInFinish")}
                </Link>
              )}
              <div className="grid grid-cols-2 gap-2">
                <a href={directions} className={cn(buttonVariants({ variant: "outline", size: "xl" }), outlineBtn)}>
                  {t("navigate")}
                </a>
                <Link href={{ pathname: "/map", query: { pub: pub.slug } }} className={cn(buttonVariants({ variant: "outline", size: "xl" }), outlineBtn)}>
                  {nav("map")}
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
      <RailTrack />

      <div className="page-column flex flex-wrap items-start gap-6 pt-6 pb-12 md:gap-8 md:pt-12 md:pb-16">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 md:gap-8">
          <Card render={<section />} className="block p-5 md:p-7">
            <h2 className="mb-5 text-[28px] md:text-[32px]">{t("about")}</h2>
            {description && <p className="mb-6 max-w-[65ch] text-[17px]">{description}</p>}
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-8 gap-y-5">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="label">{label}</dt>
                  <dd className="text-[17px] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 border-t border-rule-soft pt-4 text-[15px] text-muted-foreground">
              {rt("linkText")}{" "}
              <Link href={{ pathname: "/pub/[slug]/report", params: { slug: pub.slug } }} className="link">
                {rt("link")}
              </Link>
            </p>
            {canDeletePubs(user?.role) && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft pt-4">
                <p className="text-sm text-muted-foreground">{t("delete.hint")}</p>
                <DeletePubButton id={pub.id} name={pub.name} />
              </div>
            )}
          </Card>

          {route && mainLine && (
            <section className="flex flex-col gap-4">
              <h2 className="text-[28px] md:text-[32px]">{t("alongLine", { number: mainLine.number })}</h2>
              <RouteStrip route={route} stationId={station.id} />
            </section>
          )}

          {neighbours.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-[28px] md:text-[32px]">{t("alsoHere")}</h2>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 md:gap-4">
                {neighbours.map((n) => (
                  <li key={n.slug}>
                    <Card
                      render={<Link href={{ pathname: "/pub/[slug]", params: { slug: n.slug } }} />}
                      className="h-full gap-2 p-4 hover:border-sign md:gap-2.5 md:p-5"
                    >
                      <span className="text-lg font-semibold">{n.name}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusChip status={n.status} />
                        <span className="text-sm text-muted-foreground">{kt(n.kind)}</span>
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Card render={<section />} className="gap-5 p-5 md:p-7" aria-labelledby="checkins-title">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <h2 id="checkins-title" className="text-[28px] md:text-[32px]">
                  {t("checkIns")}
                </h2>
                <p className="font-mono text-sm font-semibold text-sign" data-testid="checkin-count">
                  {t("checkInCount", { count: summary.count })}
                </p>
              </div>
              {summary.last && (
                <div className="flex flex-col gap-0.5">
                  <span className="label">{t("lastVisit")}</span>
                  <span className="text-[17px] font-medium" data-testid="last-visit">
                    {t(summary.last.pubWasOpen ? "lastVisitOpen" : "lastVisitClosed", {
                      when: format.relativeTime(summary.last.createdAt, now),
                    })}
                  </span>
                </div>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="text-muted-foreground">{t("noCheckIns", { name: pub.name })}</p>
            ) : (
              <ul aria-label={t("recentCheckIns")} className="flex flex-col divide-y divide-rule-soft border-t border-rule-soft">
                {recent.map((c) => {
                  const had = [
                    c.beers > 0 && ct("beerCount", { count: c.beers }),
                    c.shots > 0 && ct("shotCount", { count: c.shots }),
                    c.hadNonAlcoholic && ct("nonAlcoholic"),
                    c.hadFood && ct("food"),
                  ].filter((x): x is string => !!x);
                  return (
                    <li key={c.id} className="flex flex-col gap-2 py-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-2 font-semibold">
                          <Avatar url={avatarUrl(c.userId, c.avatarUpdatedAt)} name={c.username ?? "?"} size={24} />@{c.username}
                        </span>
                        <time dateTime={c.createdAt.toISOString()} className="font-mono text-xs text-muted-foreground">
                          {format.dateTime(c.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" })}
                        </time>
                        <Badge variant={c.pubWasOpen ? "open" : "closed"}>{t(c.pubWasOpen ? "reportedOpen" : "reportedClosed")}</Badge>
                        {c.rating && (
                          <span className="font-mono text-sm font-semibold" aria-label={t("rating", { count: c.rating })}>
                            <span aria-hidden="true" className="text-star">
                              {"★".repeat(c.rating)}
                            </span>
                            <span aria-hidden="true" className="text-rule">
                              {"★".repeat(5 - c.rating)}
                            </span>
                          </span>
                        )}
                      </div>
                      {had.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5">
                          {had.map((label) => (
                            <Badge key={label} variant="secondary" render={<li />} className="h-auto px-2.5 text-[13px]">
                              {label}
                            </Badge>
                          ))}
                        </ul>
                      )}
                      {c.note && <p className="max-w-[65ch] text-[15px]">{c.note}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <Card className="gap-0 py-0">
            <PubMiniMap lat={lat} lon={lon} label={pub.name} status={pub.status} />
            <div className="flex flex-col gap-2 px-5 py-4">
              <p className="text-sm text-muted-foreground">{pub.locationMatch === "review" ? t("reviewNote") : t("positionNote")}</p>
              <Link href={{ pathname: "/map", query: { pub: pub.slug } }} className="link text-[15px]">
                {t("openOnMap")}
              </Link>
            </div>
          </Card>
          <Card className="gap-2 p-5">
            <span className="label">{t("source")}</span>
            <p className="text-[15px]">{t("sourceText")}</p>
          </Card>
        </aside>
      </div>
    </article>
  );
}
