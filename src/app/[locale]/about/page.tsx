import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("title") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("about");
  return (
    <>
      <PageHero title={t("title")} />
      <div className="page-column py-10 *:max-w-2xl md:py-14">
        <p className="text-lg leading-relaxed">{t("body")}</p>
        <h2 className="mt-10 text-[32px]">{t("dataTitle")}</h2>
        <p className="mt-3 leading-relaxed">{t("dataBody")}</p>
        <p className="mt-10">
          <a href="https://pragueguide.beer" className={buttonVariants({ size: "xl" })}>
            {t("credit")}
          </a>
        </p>
      </div>
    </>
  );
}
