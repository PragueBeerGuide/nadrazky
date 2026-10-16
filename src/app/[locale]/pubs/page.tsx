import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PubRow } from "@/components/PubRow";
import { listPubs, listRegions, type PubStatus } from "@/lib/queries";

const STATUSES: PubStatus[] = ["open", "maybe_open", "unknown"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pubs");
  return { title: t("title") };
}

export default async function PubsPage({ params, searchParams }: PageProps<"/[locale]/pubs">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const region = typeof sp.region === "string" ? sp.region : "";
  const status = STATUSES.find((s) => s === sp.status);

  const t = await getTranslations("pubs");
  const st = await getTranslations("status");
  const [pubs, regions] = await Promise.all([
    listPubs({ q, region: region || undefined, status: status ? [status] : undefined }),
    listRegions(asLocale(locale)),
  ]);
  const isCs = (await getLocale()) === "cs";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl text-primary">{t("title")}</h1>
      <form className="card mt-5 grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" role="search">
        <label className="grid gap-1 text-sm font-medium">
          {t("searchLabel")}
          <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="field" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          {t("region")}
          <select name="region" defaultValue={region} className="field">
            <option value="">{t("anyRegion")}</option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {isCs ? r.nameCs : r.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          {t("status")}
          <select name="status" defaultValue={status ?? ""} className="field">
            <option value="">{t("anyStatus")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {st(s)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-violet">{t("search")}</button>
      </form>

      <p className="mt-6 text-sm font-semibold text-primary">{t("results", { count: pubs.length })}</p>
      {pubs.length ? (
        <ul className="card mt-2 divide-y divide-border overflow-hidden">
          {pubs.map((p) => (
            <PubRow key={p.slug} pub={p} />
          ))}
        </ul>
      ) : (
        <p className="mt-4">{t("empty")}</p>
      )}
    </div>
  );
}
