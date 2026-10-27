import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BadgeDetail, badgeMetadata } from "@/components/BadgeDetail";
import { asLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/badges/pubs">): Promise<Metadata> {
  return badgeMetadata("pubs", asLocale((await params).locale));
}

export default async function PubsBadgePage({ params }: PageProps<"/[locale]/badges/pubs">) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  return <BadgeDetail badgeKey="pubs" locale={locale} />;
}
