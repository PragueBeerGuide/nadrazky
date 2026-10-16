import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LineChip } from "@/components/LineChip";
import { PageHero } from "@/components/PageHero";
import { listLines } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lines");
  return { title: t("title") };
}

export default async function LinesPage({ params }: PageProps<"/[locale]/lines">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("lines");
  const lines = await listLines();
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle", { count: lines.length })} />
      <ul className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 px-4 py-8 md:gap-4 md:px-6 md:py-12">
        {lines.map((l) => (
          <li key={l.number}>
            <Link
              href={{ pathname: "/line/[number]", params: { number: l.number } }}
              className="card flex h-full flex-col gap-3 rounded-xl p-4 hover:border-sign md:p-5"
            >
              <span className="flex items-center justify-between">
                <LineChip number={l.number} size="lg" />
                <span className="font-mono text-[13px] text-muted">{t("pubCount", { count: l.pubCount })}</span>
              </span>
              <span className="text-[17px] leading-snug font-semibold">{l.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
