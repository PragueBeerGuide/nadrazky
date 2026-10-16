import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StatusChip } from "@/components/StatusChip";
import { PubMiniMap } from "@/components/PubMiniMap";
import { getPub } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/pub/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPub(slug);
  return data ? { title: `${data.pub.name} — ${data.station.name}` } : {};
}

export default async function PubPage({ params }: PageProps<"/[locale]/pub/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(asLocale(locale));
  const data = await getPub(slug);
  if (!data) notFound();
  const { pub, station, region, lines, neighbours } = data;
  const t = await getTranslations("pub");
  const kt = await getTranslations("kind");
  const isCs = (await getLocale()) === "cs";
  const lat = pub.lat ?? station.lat;
  const lon = pub.lon ?? station.lon;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <p className="board text-lg uppercase tracking-wider text-secondary">{station.name}</p>
      <h1 className="mt-1 text-4xl text-primary md:text-5xl">{pub.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusChip status={pub.status} />
        <span className="chip chip-unknown">{kt(pub.kind)}</span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled aria-describedby="checkin-note">
          {t("checkIn")}
        </button>
        <a className="btn btn-outline" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`}>
          {t("navigate")}
        </a>
      </div>
      <p id="checkin-note" className="mt-2 text-sm text-primary/70">
        {t("checkInSoon")}
      </p>

      <div className="card mt-8 overflow-hidden">
        <PubMiniMap lat={lat} lon={lon} label={pub.name} />
        <dl className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-primary/70">{t("station")}</dt>
            <dd className="font-semibold">{station.name}</dd>
          </div>
          {region && (
            <div>
              <dt className="text-sm text-primary/70">{t("region")}</dt>
              <dd>
                <Link href={{ pathname: "/region/[slug]", params: { slug: region.slug } }} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {isCs ? region.nameCs : region.nameEn}
                </Link>
              </dd>
            </div>
          )}
          {lines.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-primary/70">{t("lines")}</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {lines.map((l) => (
                  <Link
                    key={l.number}
                    href={{ pathname: "/line/[number]", params: { number: l.number } }}
                    className="flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1 text-sm hover:bg-accent"
                  >
                    <span className="board rounded-sm bg-primary px-1.5 text-primary-foreground">{l.number}</span>
                    {l.name}
                  </Link>
                ))}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-primary/70">{t("lastConfirmed")}</dt>
            <dd className="font-semibold">
              {pub.sourceLastUpdateMonthsAgo != null ? t("monthsAgo", { count: pub.sourceLastUpdateMonthsAgo }) : t("unknownDate")}
            </dd>
          </div>
          {pub.sourceUrl && (
            <div>
              <dt className="text-sm text-primary/70">{t("source")}</dt>
              <dd>
                <a href={pub.sourceUrl} className="font-semibold text-primary underline-offset-2 hover:underline">
                  nadrazky.eu
                </a>
              </dd>
            </div>
          )}
        </dl>
        <p className="border-t border-border px-5 py-3 text-sm text-primary/70">
          {pub.locationMatch === "review" ? t("reviewNote") : t("positionNote")}
        </p>
      </div>

      {neighbours.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl text-primary">{t("alsoHere")}</h2>
          <ul className="card mt-3 divide-y divide-border overflow-hidden">
            {neighbours.map((n) => (
              <li key={n.slug}>
                <Link href={{ pathname: "/pub/[slug]", params: { slug: n.slug } }} className="flex items-center justify-between px-4 py-3 hover:bg-accent">
                  <span className="font-medium">{n.name}</span>
                  <StatusChip status={n.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
