import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BadgeDetail, badgeMetadata } from "@/components/BadgeDetail";
import { asLocale } from "@/i18n/routing";
import { badgeKey } from "@/lib/badges";

export async function generateMetadata({ params }: PageProps<"/[locale]/badges/line/[number]">): Promise<Metadata> {
  const { locale, number } = await params;
  return badgeMetadata(badgeKey("line", number), asLocale(locale));
}

export default async function LineBadgePage({ params }: PageProps<"/[locale]/badges/line/[number]">) {
  const { locale: raw, number } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  return <BadgeDetail badgeKey={badgeKey("line", number)} locale={locale} />;
}
