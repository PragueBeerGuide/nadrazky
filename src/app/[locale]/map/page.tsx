import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PubMap } from "@/components/PubMap";
import { listPubs } from "@/lib/queries";
import { PIN } from "@/lib/map";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title") };
}

export default async function MapPage({ params }: PageProps<"/[locale]/map">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("map");
  const st = await getTranslations("status");
  const pubs = await listPubs();
  const statusLabels = { open: st("open"), maybe_open: st("maybe_open"), unknown: st("unknown"), closed: st("closed") };

  return (
    <div className="relative h-[calc(100dvh-60px-64px)] md:h-[calc(100dvh-60px)]">
      <h1 className="sr-only">{t("title")}</h1>
      <PubMap pubs={pubs} statusLabels={statusLabels} />
      <div className="absolute bottom-4 left-4 z-10 flex gap-4 rounded-sm bg-card px-3 py-2 text-sm shadow-card">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: PIN.open }} /> {t("legendOpen")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: PIN.unknown }} /> {t("legendMaybe")}
        </span>
      </div>
    </div>
  );
}
