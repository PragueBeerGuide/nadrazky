import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LineChip } from "@/components/LineChip";
import { PageHero } from "@/components/PageHero";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getStationForAdmin, listLinesForAdmin } from "@/lib/railAdmin";
import { lineOption } from "@/lib/railLinks";
import { editStationLines } from "../../actions";
import { requireAdminPage } from "../../guard";
import { LinkEditor } from "../../LinkEditor";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/station/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [t, station] = await Promise.all([getTranslations("admin"), getStationForAdmin(slug)]);
  return { title: `${station?.name ?? slug} · ${t("title")}`, robots: { index: false } };
}

/** One station's rail lines: remove any, add as many as needed. */
export default async function AdminStationPage({ params }: PageProps<"/[locale]/admin/station/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  await requireAdminPage(locale, getPathname({ locale, href: { pathname: "/admin/station/[slug]", params: { slug } } }));

  const [t, station, lines] = await Promise.all([getTranslations("admin"), getStationForAdmin(slug), listLinesForAdmin()]);
  if (!station) notFound();
  const linked = new Set(station.lines.map((l) => l.number));

  return (
    <>
      <PageHero eyebrow={t("stationEyebrow")} title={station.name} subtitle={station.region ?? undefined}>
        <Link href="/admin/stations" className="link text-sign-mist hover:text-white">
          ← {t("title")}
        </Link>
      </PageHero>
      <div className="page-column py-8 *:max-w-3xl md:py-12">
        <LinkEditor
          action={editStationLines}
          owner={["stationId", String(station.id)]}
          removeField="line"
          addField="lines"
          title={t("stationLinesTitle")}
          empty={t("emptyStation")}
          addLabel={t("addLines")}
          addHint={t("addLinesHint")}
          options={lines.filter((l) => !linked.has(l.number)).map(lineOption)}
          items={station.lines.map((l) => ({
            value: l.number,
            name: `${l.number} ${l.name}`,
            content: (
              <>
                <LineChip number={l.number} />
                <Link href={{ pathname: "/admin/line/[number]", params: { number: l.number } }} className="link font-semibold">
                  {l.name}
                </Link>
              </>
            ),
          }))}
        />
      </div>
    </>
  );
}
