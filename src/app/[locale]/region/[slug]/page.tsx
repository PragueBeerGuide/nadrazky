import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/PageHero";
import { PubRow } from "@/components/PubRow";
import { getRegion, listPubs } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/region/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const r = await getRegion(slug);
  return r ? { title: locale === "cs" ? r.nameCs : r.nameEn } : {};
}

const RANK = { open: 0, unknown: 1, closed: 2 } as const;

export default async function RegionPage({ params }: PageProps<"/[locale]/region/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const region = await getRegion(slug);
  if (!region) notFound();
  const t = await getTranslations("regions");
  const nav = await getTranslations("nav");
  const pubs = (await listPubs({ region: slug })).sort((a, b) => RANK[a.status] - RANK[b.status]);
  const open = pubs.filter((p) => p.status === "open").length;
  return (
    <>
      <PageHero
        title={locale === "cs" ? region.nameCs : region.nameEn}
        subtitle={`${t("pubCount", { count: pubs.length })} · ${t("openCount", { count: open })}`}
      >
        <nav aria-label={nav("breadcrumb")} className="order-first text-sm text-[#b9c6e2]">
          <Link href="/regions" className="text-sign-mist underline underline-offset-2">
            {t("title")}
          </Link>
        </nav>
      </PageHero>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <ul className="card divide-y divide-rule-soft overflow-hidden">
          {pubs.map((p) => (
            <PubRow key={p.slug} pub={p} />
          ))}
        </ul>
      </div>
    </>
  );
}
