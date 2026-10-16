import { asLocale } from "@/i18n/routing";
import Image from "next/image";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTotals, listLines, listRegions } from "@/lib/queries";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("home");
  const lt = await getTranslations("lines");
  const [totals, regions, lines] = await Promise.all([getTotals(), listRegions(asLocale(locale)), listLines()]);
  const topLines = [...lines].sort((a, b) => b.pubCount - a.pubCount).slice(0, 8);
  const isCs = (await getLocale()) === "cs";

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow text-primary-mist">{t("eyebrow")}</p>
            <h1 className="mt-3 text-5xl leading-[1.05] md:text-7xl">{t("title")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-primary-mist">{t("lead")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/map" className="btn btn-primary">
                {t("openMap")}
              </Link>
              <Link href="/pubs" className="btn border border-primary-mist text-primary-foreground hover:bg-primary-deep">
                {t("browse")}
              </Link>
            </div>
          </div>
          <Image src="/brand/pbg-mascot.png" alt="" width={320} height={320} priority className="mx-auto hidden md:block" />
        </div>
      </section>

      <section className="bg-secondary text-secondary-foreground">
        <dl className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-4 py-5 text-center">
          {(
            [
              ["pubs", totals.pubs],
              ["stations", totals.stations],
              ["open", totals.open],
            ] as const
          ).map(([key, n]) => (
            <div key={key}>
              <dt className="sr-only">{key}</dt>
              <dd className="board text-xl font-semibold md:text-3xl">{t(`stats.${key}`, { count: n })}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
        <section className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl text-primary">{t("byRegion")}</h2>
            <Link href="/regions" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              {t("allRegions")}
            </Link>
          </div>
          <ul className="card mt-4 divide-y divide-border overflow-hidden">
            {regions.map((r) => (
              <li key={r.slug}>
                <Link
                  href={{ pathname: "/region/[slug]", params: { slug: r.slug } }}
                  className="flex justify-between px-4 py-2.5 hover:bg-accent"
                >
                  <span className="font-medium">{isCs ? r.nameCs : r.nameEn}</span>
                  <span className="text-primary">{r.pubCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl text-primary">{t("byLine")}</h2>
            <Link href="/lines" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              {t("allLines")}
            </Link>
          </div>
          <ul className="card mt-4 divide-y divide-border overflow-hidden">
            {topLines.map((l) => (
              <li key={l.number}>
                <Link
                  href={{ pathname: "/line/[number]", params: { number: l.number } }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent"
                >
                  <span className="board w-12 shrink-0 rounded-sm bg-primary px-1.5 py-0.5 text-center text-sm text-primary-foreground">
                    {l.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className="text-primary">{lt("pubCount", { count: l.pubCount })}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-2xl bg-accent p-6">
            <h3 className="text-2xl text-primary">{t("helpTitle")}</h3>
            <p className="mt-2 leading-relaxed">{t("helpText")}</p>
          </div>
        </section>
      </div>
    </>
  );
}
