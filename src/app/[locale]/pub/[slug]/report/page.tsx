import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { getPub } from "@/lib/queries";
import { kindsFor } from "@/lib/report";
import { ReportForm } from "./ReportForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/pub/[slug]/report">): Promise<Metadata> {
  const { slug } = await params;
  const [data, t] = await Promise.all([getPub(slug), getTranslations("report")]);
  return data ? { title: `${t("title")}: ${data.pub.name}`, robots: { index: false } } : {};
}

export default async function ReportPage({ params }: PageProps<"/[locale]/pub/[slug]/report">) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const data = await getPub(slug);
  if (!data) notFound();
  const { pub, station } = data;

  // Reports need a finished account; the login page brings the user back here.
  const user = await getCurrentUser();
  if (!user || !signUpFinished(user)) {
    const here = getPathname({ locale, href: { pathname: "/pub/[slug]/report", params: { slug } } });
    redirect(getPathname({ locale, href: { pathname: "/login", query: { next: here } } }));
  }

  const t = await getTranslations("report");
  return (
    <>
      <PageHero eyebrow={`${t("title")} · ${station.name}`} title={pub.name} subtitle={t("intro", { name: pub.name })} />
      <div className="page-column py-8 *:max-w-xl md:py-12">
        <ReportForm
          slug={pub.slug}
          name={pub.name}
          kinds={kindsFor(pub.status)}
          current={{ name: pub.name, hours: pub.openingHours, address: pub.address, beers: pub.beers }}
        />
      </div>
    </>
  );
}
