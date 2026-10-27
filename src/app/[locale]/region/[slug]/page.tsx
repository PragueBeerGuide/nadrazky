import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/PageHero";
import { PubRow } from "@/components/PubRow";
import { Card } from "@/components/ui/card";
import { BadgeCard } from "@/components/BadgeCard";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { badgeKey } from "@/lib/badges";
import { getRegion, listPubs } from "@/lib/queries";
import { getBadge } from "@/lib/userBadges";

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
  const bt = await getTranslations("badges");
  const user = await getCurrentUser();
  const userId = user && signUpFinished(user) ? user.id : undefined;
  const badge = await getBadge(badgeKey("region", slug), locale, userId);
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
      <div className="page-column flex flex-wrap items-start gap-6 py-8 md:gap-8 md:py-12">
        <Card render={<ul />} className="min-w-0 flex-[999_1_600px] gap-0 divide-y divide-rule-soft py-0">
          {pubs.map((p) => (
            <PubRow key={p.slug} pub={p} visited={badge?.visitedPubIds.has(p.id)} />
          ))}
        </Card>
        {badge && (
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col">
            <BadgeCard badge={badge} signedIn={Boolean(userId)} title={bt("regionCardTitle", { name: badge.name })} />
          </aside>
        )}
      </div>
    </>
  );
}
