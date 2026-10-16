import { useTranslations } from "next-intl";

/** Formats a month count as "2 months ago" / "4 years ago", or "2 mo" when `short`. */
export function useAgo() {
  const t = useTranslations("ago");
  return (months: number | null | undefined, short = false) => {
    if (months == null) return t("unknown");
    if (months < 24) return short ? t("monthsShort", { count: months }) : t("months", { count: months });
    const years = Math.floor(months / 12);
    return short ? t("yearsShort", { count: years }) : t("years", { count: years });
  };
}

export function Ago({ months, short = false }: { months: number | null | undefined; short?: boolean }) {
  return <>{useAgo()(months, short)}</>;
}
