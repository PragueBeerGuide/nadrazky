import { useTranslations } from "next-intl";
import { formatAgo } from "@/lib/ago";

/** Formats a month count as "2 months ago" / "4 years ago", or "2 mo" when `short`. */
export function useAgo() {
  const t = useTranslations("ago");
  return (months: number | null | undefined, short = false) => formatAgo(t, months, short);
}

export function Ago({ months, short = false }: { months: number | null | undefined; short?: boolean }) {
  return <>{useAgo()(months, short)}</>;
}
