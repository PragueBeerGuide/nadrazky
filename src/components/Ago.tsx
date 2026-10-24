import { useTranslations } from "next-intl";
import { formatAgo } from "@/lib/ago";

type When = Date | string | null | undefined;

/**
 * Formats when a pub was last confirmed: "today", "yesterday" or "this week" from its date when
 * recent, otherwise its month count as "2 months ago" / "4 years ago"; "2 mo" when `short`.
 */
export function useAgo() {
  const t = useTranslations("ago");
  return (months: number | null | undefined, short = false, date?: When) => formatAgo(t, months, short, date);
}

export function Ago({ months, short = false, date }: { months: number | null | undefined; short?: boolean; date?: When }) {
  return <>{useAgo()(months, short, date)}</>;
}
