import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PubRow } from "@/components/PubRow";
import { getRegion, listPubs } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/region/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const r = await getRegion(slug);
  return r ? { title: locale === "cs" ? r.nameCs : r.nameEn } : {};
}

export default async function RegionPage({ params }: PageProps<"/[locale]/region/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(asLocale(locale));
  const region = await getRegion(slug);
  if (!region) notFound();
  const t = await getTranslations("regions");
  const pubs = await listPubs({ region: slug });
  const isCs = (await getLocale()) === "cs";
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl text-primary">{isCs ? region.nameCs : region.nameEn}</h1>
      <p className="mt-1 text-sm font-semibold text-secondary">{t("pubCount", { count: pubs.length })}</p>
      <ul className="card mt-5 divide-y divide-border overflow-hidden">
        {pubs.map((p) => (
          <PubRow key={p.slug} pub={p} />
        ))}
      </ul>
    </div>
  );
}
