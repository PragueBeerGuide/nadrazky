import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LineChip } from "@/components/LineChip";
import { PageHero } from "@/components/PageHero";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { listStationsForAdmin } from "@/lib/railAdmin";
import { cn } from "@/lib/utils";
import { AdminTabs } from "../AdminTabs";
import { requireAdminPage } from "../guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

/** Every station with its lines, searchable and filterable to those without a line. */
export default async function AdminStationsPage({ params, searchParams }: PageProps<"/[locale]/admin/stations">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const withoutLine = query.noLine === "1";
  await requireAdminPage(locale, getPathname({ locale, href: "/admin/stations" }));

  const [t, stations] = await Promise.all([getTranslations("admin"), listStationsForAdmin({ q, withoutLine })]);
  const filter = (active: boolean) => cn(buttonVariants({ variant: active ? "ink" : "outline", size: "xl" }), "h-11");
  const withQ = q ? { q } : {};

  return (
    <>
      <PageHero title={t("title")} subtitle={t("stationsSubtitle", { count: stations.length })}>
        <AdminTabs current="stations" />
      </PageHero>
      <div className="page-column flex flex-col gap-5 py-8 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form role="search" className="flex w-full max-w-md gap-2">
            {withoutLine && <input type="hidden" name="noLine" value="1" />}
            <Input type="search" name="q" defaultValue={q} aria-label={t("search")} placeholder={t("search")} />
            <Button type="submit" variant="outline" size="xl" className="h-11.5">
              {t("searchButton")}
            </Button>
          </form>
          <nav className="flex gap-2">
            <Link href={{ pathname: "/admin/stations", query: withQ }} aria-current={!withoutLine ? "page" : undefined} className={filter(!withoutLine)}>
              {t("filterAll")}
            </Link>
            <Link
              href={{ pathname: "/admin/stations", query: { ...withQ, noLine: "1" } }}
              aria-current={withoutLine ? "page" : undefined}
              className={filter(withoutLine)}
            >
              {t("filterNoLine")}
            </Link>
          </nav>
        </div>
        {stations.length === 0 ? (
          <Card render={<p />} className="p-5 text-muted-foreground">
            {t("noResults")}
          </Card>
        ) : (
          <Card render={<ul />} className="gap-0 divide-y divide-rule-soft py-0">
            {stations.map((s) => (
              <li key={s.id}>
                <Link
                  href={{ pathname: "/admin/station/[slug]", params: { slug: s.slug } }}
                  className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-platform md:px-5"
                >
                  <span className="font-semibold">{s.name}</span>
                  {s.region && <span className="text-sm text-muted-foreground">{s.region}</span>}
                  <span className="ml-auto flex flex-wrap gap-1">
                    {s.lines.length ? (
                      s.lines.map((n) => <LineChip key={n} number={n} />)
                    ) : (
                      <span className="font-mono text-[13px] font-semibold text-destructive">{t("noLine")}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
