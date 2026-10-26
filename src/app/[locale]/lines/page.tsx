import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LineChip } from "@/components/LineChip";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/card";
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
      <ul className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5 px-4 py-6 md:gap-4 md:px-6 md:py-12">
        {lines.map((l) => (
          <li key={l.number}>
            <Card
              render={<Link href={{ pathname: "/line/[number]", params: { number: l.number } }} />}
              className="h-full flex-row items-center gap-3.5 p-3.5 hover:border-sign md:flex-col md:items-stretch md:gap-3 md:p-5"
            >
              <span className="flex shrink-0 items-center justify-between">
                <LineChip number={l.number} size="lg" />
                <span className="hidden font-mono text-[13px] text-muted-foreground md:inline">{t("pubCount", { count: l.pubCount })}</span>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[17px] leading-snug font-semibold">{l.name}</span>
                <span className="font-mono text-[13px] text-muted-foreground md:hidden">{t("pubCount", { count: l.pubCount })}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
