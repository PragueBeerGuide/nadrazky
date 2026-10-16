import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listRegions } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("regions");
  return { title: t("title") };
}

export default async function RegionsPage({ params }: PageProps<"/[locale]/regions">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("regions");
  const regions = await listRegions(asLocale(locale));
  const isCs = (await getLocale()) === "cs";
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl text-primary">{t("title")}</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {regions.map((r) => (
          <li key={r.slug}>
            <Link
              href={{ pathname: "/region/[slug]", params: { slug: r.slug } }}
              className="card flex items-center justify-between p-4 hover:bg-accent"
            >
              <span className="board text-xl font-semibold text-primary">{isCs ? r.nameCs : r.nameEn}</span>
              <span className="text-sm">{t("pubCount", { count: r.pubCount })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
