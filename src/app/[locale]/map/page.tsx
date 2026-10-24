import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapExplorer } from "@/components/MapExplorer";
import { listLines, listPubs } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title") };
}

export default async function MapPage({ params, searchParams }: PageProps<"/[locale]/map">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const [pubs, lines] = await Promise.all([listPubs(), listLines()]);

  return (
    <MapExplorer
      pubs={pubs.map((p) => ({
        slug: p.slug,
        name: p.name,
        station: p.station,
        stationId: p.stationId,
        status: p.status,
        kind: p.kind,
        lines: p.lines,
        monthsAgo: p.monthsAgo,
        lastConfirmedAt: p.lastConfirmedAt?.toISOString() ?? null,
        lat: p.lat,
        lon: p.lon,
      }))}
      lines={lines.map((l) => ({ number: l.number, name: l.name }))}
      initialLine={one(sp.line)}
      initialPub={one(sp.pub)}
      locate={sp.near === "1"}
    />
  );
}
