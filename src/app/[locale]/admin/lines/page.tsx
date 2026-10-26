import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LineChip } from "@/components/LineChip";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { listLinesForAdmin } from "@/lib/railAdmin";
import { cn } from "@/lib/utils";
import { AdminTabs } from "../AdminTabs";
import { requireAdminPage } from "../guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

/** Every rail line, including those without a station yet, each opening its editor. */
export default async function AdminLinesPage({ params, searchParams }: PageProps<"/[locale]/admin/lines">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const onlyEmpty = (await searchParams).empty === "1";
  await requireAdminPage(locale, getPathname({ locale, href: "/admin/lines" }));

  const [t, all] = await Promise.all([getTranslations("admin"), listLinesForAdmin()]);
  const empty = all.filter((l) => l.stationCount === 0).length;
  const lines = onlyEmpty ? all.filter((l) => l.stationCount === 0) : all;
  const filter = (active: boolean) => cn(buttonVariants({ variant: active ? "ink" : "outline", size: "xl" }), "h-11");

  return (
    <>
      <PageHero title={t("title")} subtitle={t("linesSubtitle", { count: all.length, empty })}>
        <AdminTabs current="lines" />
      </PageHero>
      <div className="page-column flex flex-col gap-5 py-8 md:py-12">
        <nav className="flex gap-2">
          <Link href="/admin/lines" aria-current={!onlyEmpty ? "page" : undefined} className={filter(!onlyEmpty)}>
            {t("filterAll")}
          </Link>
          <Link href={{ pathname: "/admin/lines", query: { empty: "1" } }} aria-current={onlyEmpty ? "page" : undefined} className={filter(onlyEmpty)}>
            {t("filterEmpty")} ({empty})
          </Link>
        </nav>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
          {lines.map((l) => (
            <li key={l.number}>
              <Card
                render={<Link href={{ pathname: "/admin/line/[number]", params: { number: l.number } }} />}
                className="h-full flex-row items-center gap-3.5 p-3.5 hover:border-sign"
              >
                <LineChip number={l.number} size="lg" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="leading-snug font-semibold">{l.name}</span>
                  <span className={cn("font-mono text-[13px]", l.stationCount ? "text-muted-foreground" : "font-semibold text-destructive")}>
                    {t("stationCount", { count: l.stationCount })}
                  </span>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
