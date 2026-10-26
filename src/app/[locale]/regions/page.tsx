import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/card";
import { listRegions } from "@/lib/queries";
import { Progress } from "@/components/ui/progress";

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
      <ul className="page-column grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 py-8 md:py-12">
        {regions.map((r) => (
          <li key={r.slug}>
            <Card
              render={<Link href={{ pathname: "/region/[slug]", params: { slug: r.slug } }} />}
              className="gap-3 p-4 hover:border-sign md:p-5"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[26px] leading-none font-bold">{isCs ? r.nameCs : r.nameEn}</span>
                <span className="font-mono text-[15px] font-semibold text-sign">{r.pubCount}</span>
              </span>
              <Progress value={Math.round((r.pubCount / max) * 100)} aria-hidden="true" className="[&_[data-slot=progress-track]]:h-1.5" />
              <span className="flex justify-between text-sm text-muted-foreground">
                <span>{t("pubCount", { count: r.pubCount })}</span>
                <span className="font-semibold text-open-ink">{t("openCount", { count: r.openCount })}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
