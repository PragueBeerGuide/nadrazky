import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LineChip } from "@/components/LineChip";
import { PageHero } from "@/components/PageHero";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getLineForAdmin, listStationNames } from "@/lib/railAdmin";
import { editLineStations } from "../../actions";
import { requireAdminPage } from "../../guard";
import { LinkEditor } from "../../LinkEditor";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/line/[number]">): Promise<Metadata> {
  const { number } = await params;
  const t = await getTranslations("admin");
  return { title: `${number} · ${t("title")}`, robots: { index: false } };
}

/** One rail line's stations: remove any, add more by name. */
export default async function AdminLinePage({ params }: PageProps<"/[locale]/admin/line/[number]">) {
  const { locale: raw, number } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  await requireAdminPage(locale, getPathname({ locale, href: { pathname: "/admin/line/[number]", params: { number } } }));

  const [t, line, names] = await Promise.all([getTranslations("admin"), getLineForAdmin(number), listStationNames()]);
  if (!line) notFound();
  const linked = new Set(line.stations.map((s) => s.name));

  return (
    <>
      <PageHero eyebrow={t("lineEyebrow")} title={line.name}>
        <div className="flex flex-wrap items-center gap-4">
          <LineChip number={line.number} size="lg" />
          <Link href="/admin/lines" className="link text-sign-mist hover:text-white">
            ← {t("title")}
          </Link>
          {line.stations.length > 0 && (
            <Link href={{ pathname: "/line/[number]", params: { number: line.number } }} className="link text-sign-mist hover:text-white">
              {t("publicLine")}
            </Link>
          )}
        </div>
      </PageHero>
      <div className="page-column py-8 *:max-w-3xl md:py-12">
        <LinkEditor
          action={editLineStations}
          owner={["line", line.number]}
          removeField="stationId"
          addField="station"
          title={t("lineStationsTitle")}
          empty={t("emptyLine")}
          addLabel={t("addStation")}
          addHint={t("addStationHint")}
          options={names.filter((n) => !linked.has(n))}
          items={line.stations.map((s) => ({
            value: String(s.id),
            name: s.name,
            content: (
              <>
                <Link href={{ pathname: "/admin/station/[slug]", params: { slug: s.slug } }} className="link font-semibold">
                  {s.name}
                </Link>
                {s.region && <span className="text-sm text-muted-foreground">{s.region}</span>}
                <span className="flex flex-wrap gap-1">
                  {s.lines
                    .filter((n) => n !== line.number)
                    .map((n) => (
                      <LineChip key={n} number={n} />
                    ))}
                </span>
              </>
            ),
          }))}
        />
      </div>
    </>
  );
}
