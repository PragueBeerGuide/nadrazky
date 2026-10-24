import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Ago } from "@/components/Ago";
import { LineChip } from "@/components/LineChip";
import { StatusChip } from "@/components/StatusChip";
import { listLines, listPubs, listRegions, type PubListItem, type PubStatus } from "@/lib/queries";
import { czechInitial } from "@/lib/czech";
import { PIN } from "@/lib/map";

const STATUSES: PubStatus[] = ["open", "unknown", "closed"];
const collator = new Intl.Collator("cs");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pubs");
  return { title: t("title") };
}

export default async function PubsPage({ params, searchParams }: PageProps<"/[locale]/pubs">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const q = one(sp.q);
  const region = one(sp.region);
  const line = one(sp.line);
  const status = STATUSES.find((s) => s === sp.status);

  const t = await getTranslations("pubs");
  const st = await getTranslations("status");
  const kt = await getTranslations("kind");
  const [all, regions, lines] = await Promise.all([
    listPubs({ q, region: region || undefined, line: line || undefined }),
    listRegions(locale),
    listLines(),
  ]);
  const isCs = locale === "cs";
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((p) => p.status === s).length])) as Record<PubStatus, number>;
  const pubs = (status ? all.filter((p) => p.status === status) : all).sort(
    (a, b) => collator.compare(a.station, b.station) || collator.compare(a.name, b.name),
  );
  const groups: { letter: string; pubs: PubListItem[] }[] = [];
  for (const p of pubs) {
    const letter = czechInitial(p.station);
    const group = groups.find((g) => g.letter === letter);
    if (group) group.pubs.push(p);
    else groups.push({ letter, pubs: [p] });
  }
  const stationCount = new Set(pubs.map((p) => p.stationId)).size;
  const filtered = Boolean(q || region || line || status);
  const query = (s?: PubStatus) => ({
    ...(q && { q }),
    ...(region && { region }),
    ...(line && { line }),
    ...(s && { status: s }),
  });
  const anchor = (letter: string) => `letter-${letter.toLowerCase()}`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-6 pb-12 md:gap-6 md:px-6 md:pt-10 md:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-5xl md:text-[64px]">{t("title")}</h1>
          <p className="text-muted md:text-[17px]">{t("subtitle", { pubs: pubs.length, stations: stationCount })}</p>
        </div>
        <nav aria-label={t("viewLabel")} className="flex gap-1 rounded-[10px] border border-rule bg-white p-1">
          <span aria-current="page" className="inline-flex h-10 items-center gap-2 rounded-[7px] bg-sign px-4 text-[15px] font-semibold text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            {t("viewList")}
          </span>
          <Link
            href={line ? { pathname: "/map", query: { line } } : "/map"}
            className="inline-flex h-10 items-center gap-2 rounded-[7px] px-4 text-[15px] font-semibold hover:bg-platform"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14" />
            </svg>
            {t("viewMap")}
          </Link>
        </nav>
      </div>

      <form role="search" className="card grid gap-4 rounded-[14px] p-4 md:grid-cols-4 md:items-end md:p-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium md:col-span-2">
          {t("searchLabel")}
          <input name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder")} className="field font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("region")}
          <select name="region" defaultValue={region} className="field font-normal">
            <option value="">{t("anyRegion")}</option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {isCs ? r.nameCs : r.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("line")}
          <select name="line" defaultValue={line} className="field font-normal">
            <option value="">{t("anyLine")}</option>
            {lines.map((l) => (
              <option key={l.number} value={l.number}>
                {l.number} · {l.name}
              </option>
            ))}
          </select>
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
          <span className="w-full text-sm font-medium">{t("status")}</span>
          <StatusLink href={query()} current={!status}>
            {t("anyStatus")} · {all.length}
          </StatusLink>
          {STATUSES.filter((s) => counts[s] > 0 || s === status).map((s) => (
            <StatusLink key={s} href={query(s)} current={status === s} dot={PIN[s]}>
              {st(s)} · {counts[s]}
            </StatusLink>
          ))}
          <span className="ml-auto flex gap-2">
            {filtered && (
              <Link href="/pubs" className="btn btn-outline h-10 min-h-0 px-4 text-sm">
                {t("clear")}
              </Link>
            )}
            <button className="btn btn-sign h-10 min-h-0 px-5 text-sm">{t("search")}</button>
          </span>
        </div>
      </form>

      {groups.length > 1 && (
        <nav aria-label={t("jump")} className="flex flex-wrap gap-1 font-mono text-sm font-semibold">
          {groups.map((g) => (
            <a
              key={g.letter}
              href={`#${anchor(g.letter)}`}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-[6px] border border-rule bg-white px-1.5 hover:border-sign hover:bg-sign hover:text-white"
            >
              {g.letter}
            </a>
          ))}
        </nav>
      )}

      {pubs.length ? (
        <div className="card overflow-hidden rounded-[14px]">
          <table className="w-full border-collapse text-[15px]">
            <caption className="sr-only">{t("results", { count: pubs.length })}</caption>
            <thead>
              <tr className="label text-left">
                <th scope="col" className="py-3.5 pr-4 pl-4 md:pl-6">
                  {t("colPub")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 md:table-cell">
                  {t("colStation")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 lg:table-cell">
                  {t("colLines")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 xl:table-cell">
                  {t("colRegion")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 lg:table-cell">
                  {t("colType")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  <span className="sr-only md:not-sr-only">{t("colStatus")}</span>
                </th>
                <th scope="col" className="hidden py-3.5 pr-6 pl-4 text-right md:table-cell">
                  {t("colConfirmed")}
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.letter} id={anchor(g.letter)} className="scroll-mt-4">
                <tr>
                  <th
                    colSpan={7}
                    scope="rowgroup"
                    className="border-t border-rule bg-platform px-4 py-2.5 text-left font-display text-[28px] leading-none font-bold text-sign md:px-6"
                  >
                    {g.letter}
                  </th>
                </tr>
                {g.pubs.map((p) => (
                  <tr key={p.slug} className="border-t border-rule-soft hover:bg-[#f7f9fd]">
                    <td className="py-3 pr-4 pl-4 md:pl-6">
                      <Link href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }} className="font-semibold hover:text-sign hover:underline">
                        {p.name}
                      </Link>
                      <span className="block text-sm text-muted md:hidden">
                        {p.station} · {kt(p.kind)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{p.station}</td>
                    <td className="hidden px-4 py-3 whitespace-nowrap lg:table-cell">
                      <span className="inline-flex gap-1">
                        {p.lines.slice(0, 4).map((n) => (
                          <LineChip key={n} number={n} className="text-xs" />
                        ))}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted xl:table-cell">{(isCs ? p.regionCs : p.regionEn) ?? "—"}</td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{kt(p.kind)}</td>
                    <td className="px-4 py-3 text-right md:text-left">
                      <StatusChip status={p.status} />
                    </td>
                    <td className="hidden py-3 pr-6 pl-4 text-right font-mono text-[13px] whitespace-nowrap text-muted md:table-cell">
                      <Ago months={p.monthsAgo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      ) : (
        <p className="card p-6">{t("empty")}</p>
      )}
    </div>
  );
}

function StatusLink({
  href,
  current,
  dot,
  children,
}: {
  href: Record<string, string>;
  current: boolean;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={{ pathname: "/pubs", query: href }}
      aria-current={current ? "true" : undefined}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
        current ? "border-sign bg-sign text-white" : "border-field bg-white hover:border-ink"
      }`}
    >
      {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot, boxShadow: current ? "0 0 0 2px #fff" : undefined }} />}
      {children}
    </Link>
  );
}
