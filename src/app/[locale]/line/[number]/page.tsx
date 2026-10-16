import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PubRow } from "@/components/PubRow";
import { getLine, listPubs } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/line/[number]">): Promise<Metadata> {
  const { number } = await params;
  const line = await getLine(number);
  return line ? { title: `${line.number} ${line.nameCs}` } : {};
}

export default async function LinePage({ params }: PageProps<"/[locale]/line/[number]">) {
  const { locale, number } = await params;
  setRequestLocale(asLocale(locale));
  const line = await getLine(number);
  if (!line) notFound();
  const t = await getTranslations("lines");
  const pubs = await listPubs({ line: number });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="eyebrow">{t("line", { number: line.number })}</p>
      <h1 className="mt-2 text-4xl text-primary">{line.nameCs}</h1>
      <p className="mt-1 text-sm font-semibold text-secondary">{t("pubCount", { count: pubs.length })}</p>
      <ul className="card mt-5 divide-y divide-border overflow-hidden">
        {pubs.map((p) => (
          <PubRow key={p.slug} pub={p} />
        ))}
      </ul>
    </div>
  );
}
