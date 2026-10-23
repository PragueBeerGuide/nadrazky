type AgoKey = "months" | "years" | "monthsShort" | "yearsShort" | "unknown";

/** Translator for the `ago` messages namespace. */
export type AgoTranslator = (key: AgoKey, values?: { count: number }) => string;

/** "2 months ago" up to two years, then "4 years ago"; `short` gives "2 mo" / "4 yr". */
export function formatAgo(t: AgoTranslator, months: number | null | undefined, short = false) {
  if (months == null) return t("unknown");
  if (months < 24) return short ? t("monthsShort", { count: months }) : t("months", { count: months });
  const years = Math.floor(months / 12);
  return short ? t("yearsShort", { count: years }) : t("years", { count: years });
}
