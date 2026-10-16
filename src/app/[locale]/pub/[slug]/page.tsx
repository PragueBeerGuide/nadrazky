import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Ago } from "@/components/Ago";
import { LineChip } from "@/components/LineChip";
import { PubMiniMap } from "@/components/PubMiniMap";
import { RailTrack } from "@/components/RailTrack";
import { RouteStrip } from "@/components/RouteStrip";
import { StationSign } from "@/components/StationSign";
import { StatusChip } from "@/components/StatusChip";
import { getLineStops, getPub } from "@/lib/queries";

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
  const { pub, station, region, lines, neighbours } = data;
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
    ...(lines.length
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
            </span>,
          ] as [string, React.ReactNode],
        ]
      : []),
    [t("lastConfirmed"), <Ago key="a" months={pub.sourceLastUpdateMonthsAgo} />],
    [
      t("openingHours"),
      pub.openingHours ?? (
        <span key="o" className="text-muted">
          {t("notKnownYet")}
        </span>
      ),
    ],
    ...(pub.address ? [[t("address"), pub.address] as [string, React.ReactNode]] : []),
    ...(pub.beers ? [[t("beers"), pub.beers] as [string, React.ReactNode]] : []),
  ];

  return (
    <article>
      <section className="bg-sign px-4 pt-4 pb-7 text-white md:px-6 md:pt-6 md:pb-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-8">
          <nav aria-label={nav("breadcrumb")} className="text-sm text-[#b9c6e2]">
            <ol className="flex flex-wrap gap-x-1.5">
              <li>
                <Link href="/pubs" className="text-sign-mist underline underline-offset-2">
                  {nav("pubs")}
                </Link>
              </li>
              {region && (
                <li>
                  <span aria-hidden="true">/ </span>
                  <Link href={{ pathname: "/region/[slug]", params: { slug: region.slug } }} className="text-sign-mist underline underline-offset-2">
                    {regionName}
                  </Link>
                </li>
              )}
              <li aria-current="page">
                <span aria-hidden="true">/ </span>
                {station.name}
              </li>
            </ol>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-8 md:gap-10">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4 md:gap-5">
              <StationSign name={station.name} size="lg" className="self-start" />
              <h1 className="text-[40px] md:text-[60px]">{pub.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={pub.status} className="md:px-3.5 md:py-1 md:text-[15px]" />
                <span className="rounded-full border border-sign-line px-3 py-0.5 text-sm md:px-3.5 md:text-[15px]">{kt(pub.kind)}</span>
                {lines.slice(0, 2).map((l) => (
                  <Link
                    key={l.number}
                    href={{ pathname: "/line/[number]", params: { number: l.number } }}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-sign-line py-0.5 pr-3.5 pl-1 text-sm hover:bg-sign-deep md:text-[15px]"
                  >
                    <span className="line-chip rounded-full">{l.number}</span>
                    <span className="hidden truncate sm:inline">{l.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3.5 rounded-2xl bg-white p-5 text-ink shadow-[0_16px_40px_rgb(5_12_28/0.3)] md:w-auto md:flex-[0_1_400px] md:p-6">
              <h2 className="text-[30px]">{t("checkInTitle")}</h2>
              <p className="text-[15px] text-muted">{t("checkInText")}</p>
              <button type="button" disabled aria-describedby="checkin-soon" className="btn btn-yellow h-14 rounded-xl text-lg">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                  <path d="m9 10 2 2 4-4" />
                </svg>
                {t("checkIn")}
              </button>
              <p id="checkin-soon" className="-mt-1 text-center font-mono text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                {t("checkInSoon")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a href={directions} className="btn btn-outline h-[46px] min-h-0 px-3 text-[15px]">
                  {t("navigate")}
                </a>
                <Link href={{ pathname: "/map", query: { pub: pub.slug } }} className="btn btn-outline h-[46px] min-h-0 px-3 text-[15px]">
                  {nav("map")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <RailTrack />

      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-6 px-4 pt-6 pb-12 md:gap-8 md:px-6 md:pt-12 md:pb-16">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 md:gap-8">
          <section className="card p-5 md:p-7">
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
          </section>

          {route && mainLine && (
            <section className="flex flex-col gap-4">
              <h2 className="text-[28px] md:text-[32px]">{t("alongLine", { number: mainLine.number })}</h2>
              <RouteStrip route={route} stationId={station.id} />
            </section>
          )}

          {neighbours.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-[28px] md:text-[32px]">{t("alsoHere")}</h2>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {neighbours.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={{ pathname: "/pub/[slug]", params: { slug: n.slug } }}
                      className="card flex h-full flex-col gap-2.5 rounded-xl p-5 hover:border-sign"
                    >
                      <span className="text-lg font-semibold">{n.name}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusChip status={n.status} />
                        <span className="text-sm text-muted">{kt(n.kind)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-5 rounded-[14px] border border-dashed border-field bg-white p-5 md:p-7">
            <div className="flex max-w-[52ch] flex-col gap-1">
              <h2 className="text-[28px]">{t("checkIns")}</h2>
              <p className="text-muted">{t("checkInsSoonText", { name: pub.name })}</p>
            </div>
            <span className="rounded-full bg-sign-tint px-3.5 py-1.5 font-mono text-xs font-semibold tracking-[0.08em] text-sign uppercase">
              {t("checkInSoon")}
            </span>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <div className="card overflow-hidden">
            <PubMiniMap lat={lat} lon={lon} label={pub.name} status={pub.status} />
            <div className="flex flex-col gap-2 px-5 py-4">
              <p className="text-sm text-muted">{pub.locationMatch === "review" ? t("reviewNote") : t("positionNote")}</p>
              <Link href={{ pathname: "/map", query: { pub: pub.slug } }} className="link text-[15px]">
                {t("openOnMap")}
              </Link>
            </div>
          </div>
          <div className="card flex flex-col gap-2 p-5">
            <span className="label">{t("source")}</span>
            <p className="text-[15px]">{t("sourceText")}</p>
            {pub.sourceUrl && (
              <a href={pub.sourceUrl} className="link text-[15px]">
                {t("viewSource")}
              </a>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
