import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BadgeDetail, badgeMetadata } from "@/components/BadgeDetail";
import { asLocale } from "@/i18n/routing";
import { badgeKey } from "@/lib/badges";

export async function generateMetadata({ params }: PageProps<"/[locale]/badges/region/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  return badgeMetadata(badgeKey("region", slug), asLocale(locale));
}

export default async function RegionBadgePage({ params }: PageProps<"/[locale]/badges/region/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  return <BadgeDetail badgeKey={badgeKey("region", slug)} locale={locale} />;
}
