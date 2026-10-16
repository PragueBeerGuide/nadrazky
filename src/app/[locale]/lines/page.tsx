import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listLines } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lines");
  return { title: t("title") };
}

export default async function LinesPage({ params }: PageProps<"/[locale]/lines">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("lines");
  const lines = await listLines();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl text-primary">{t("title")}</h1>
      <ul className="card mt-6 divide-y divide-border overflow-hidden">
        {lines.map((l) => (
          <li key={l.number}>
            <Link
              href={{ pathname: "/line/[number]", params: { number: l.number } }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
            >
              <span className="board w-12 shrink-0 rounded-sm bg-primary px-1.5 py-0.5 text-center text-sm text-primary-foreground">
                {l.number}
              </span>
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              <span className="shrink-0 text-sm text-primary">{t("pubCount", { count: l.pubCount })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
