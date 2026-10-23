import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PubListItem } from "@/lib/queries";
import { Ago } from "./Ago";
import { LineChip } from "./LineChip";

/** The dark departures board: line, station, pub and when it was last confirmed. */
export function DepartureBoard({
  pubs,
  title,
  meta,
  footer,
  className = "",
}: {
  pubs: PubListItem[];
  title: string;
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("home");
  const st = useTranslations("status");
  const cols = "grid-cols-[48px_minmax(0,1fr)_auto] md:grid-cols-[64px_minmax(0,1fr)_minmax(0,1.15fr)_104px]";
  return (
    <section
      className={`rounded-[14px] border border-[#22324f] bg-board px-4 pt-4 pb-1.5 shadow-[0_24px_48px_rgb(5_12_28/0.35)] md:rounded-2xl md:px-6 md:pt-6 md:pb-4 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2 md:pb-4">
        <h2 className="text-2xl font-semibold text-white md:text-3xl">{title}</h2>
        {meta}
      </div>
      <div
        aria-hidden="true"
        className={`hidden gap-3 pb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-yellow uppercase md:grid ${cols}`}
      >
        <span>{t("colLine")}</span>
        <span>{t("colStation")}</span>
        <span>{t("colPub")}</span>
        <span>{t("colStatus")}</span>
      </div>
      <ul>
        {pubs.map((p) => (
          <li key={p.slug}>
            <Link
              href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }}
              className={`grid items-center gap-2.5 border-t border-board-rule py-2.5 hover:bg-white/5 md:gap-3 md:py-[11px] ${cols}`}
            >
              <span>{p.lines[0] && <LineChip number={p.lines[0]} className="md:text-sm" />}</span>
              <span className="flex min-w-0 flex-col leading-tight md:contents">
                <span className="truncate font-display text-[21px] font-semibold text-white md:text-[23px]">{p.station}</span>
                <span className="truncate text-[13px] text-board-text md:text-[15px]">{p.name}</span>
              </span>
              <span className="flex flex-col items-end gap-px md:items-start">
                <span className="hidden items-center gap-1.5 text-sm font-semibold text-open-board md:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-[#3cc172]" />
                  {st(p.status)}
                </span>
                <span className="font-mono text-xs text-open-board md:text-board-muted">
                  <span className="md:hidden">
                    <Ago months={p.monthsAgo} short />
                  </span>
                  <span className="hidden md:inline">
                    <Ago months={p.monthsAgo} />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {footer && <div className="hidden border-t border-board-rule pt-3.5 md:block">{footer}</div>}
    </section>
  );
}
