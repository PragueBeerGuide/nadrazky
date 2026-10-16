import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/PageHero";
import { listRegions } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("regions");
  return { title: t("title") };
}

export default async function RegionsPage({ params }: PageProps<"/[locale]/regions">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("regions");
  const regions = await listRegions(locale);
  const isCs = locale === "cs";
  const max = Math.max(1, ...regions.map((r) => r.pubCount));
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <ul className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 px-4 py-8 md:px-6 md:py-12">
        {regions.map((r) => (
          <li key={r.slug}>
            <Link
              href={{ pathname: "/region/[slug]", params: { slug: r.slug } }}
              className="card flex flex-col gap-3 rounded-xl p-4 hover:border-sign md:p-5"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[26px] leading-none font-bold">{isCs ? r.nameCs : r.nameEn}</span>
                <span className="font-mono text-[15px] font-semibold text-sign">{r.pubCount}</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-rule-soft">
                <span className="block h-full rounded-full bg-sign" style={{ width: `${Math.round((r.pubCount / max) * 100)}%` }} />
              </span>
              <span className="flex justify-between text-sm text-muted">
                <span>{t("pubCount", { count: r.pubCount })}</span>
                <span className="font-semibold text-open-ink">{t("openCount", { count: r.openCount })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
