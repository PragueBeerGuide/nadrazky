import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("title") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("about");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-4xl text-primary">{t("title")}</h1>
      <p className="mt-4 text-lg leading-relaxed">{t("body")}</p>
      <h2 className="mt-10 text-2xl text-primary">{t("dataTitle")}</h2>
      <p className="mt-3 leading-relaxed">{t("dataBody")}</p>
      <p className="mt-10">
        <a href="https://pragueguide.beer" className="btn btn-violet">
          {t("credit")}
        </a>
      </p>
    </div>
  );
}
