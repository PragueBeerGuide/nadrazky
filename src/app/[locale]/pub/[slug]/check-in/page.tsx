import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { hasCheckedInToday } from "@/lib/checkins";
import { getPub } from "@/lib/queries";
import { CheckInForm } from "./CheckInForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/pub/[slug]/check-in">): Promise<Metadata> {
  const { slug } = await params;
  const [data, t] = await Promise.all([getPub(slug), getTranslations("checkIn")]);
  return data ? { title: `${t("title")}: ${data.pub.name}`, robots: { index: false } } : {};
}

export default async function CheckInPage({ params }: PageProps<"/[locale]/pub/[slug]/check-in">) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const data = await getPub(slug);
  if (!data) notFound();
  const { pub, station } = data;

  // Check-ins need a finished account; the login page brings the user back here.
  const user = await getCurrentUser();
  if (!user || !signUpFinished(user)) {
    const here = getPathname({ locale, href: { pathname: "/pub/[slug]/check-in", params: { slug } } });
    redirect(getPathname({ locale, href: { pathname: "/login", query: { next: here } } }));
  }

  const t = await getTranslations("checkIn");
  const pubHref = { pathname: "/pub/[slug]", params: { slug } } as const;
  const done = await hasCheckedInToday(user.id, pub.id);

  return (
    <>
      <PageHero eyebrow={`${t("title")} · ${station.name}`} title={pub.name} />
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8 md:py-12">
        {done ? (
          <section className="card flex flex-col gap-4 p-5 md:p-7">
            <h2 className="text-[28px]">{t("alreadyTitle")}</h2>
            <p>{t("alreadyText", { name: pub.name })}</p>
            <Link href={pubHref} className="btn btn-sign self-start">
              {t("back")}
            </Link>
          </section>
        ) : (
          <CheckInForm slug={pub.slug} locale={locale} />
        )}
        {!done && (
          <Link href={pubHref} className="link self-center text-[15px]">
            {t("back")}
          </Link>
        )}
      </div>
    </>
  );
}
