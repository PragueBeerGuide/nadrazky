import { useTranslations } from "next-intl";
import type { PubStatus } from "@/lib/queries";

export function StatusChip({ status, className = "" }: { status: PubStatus; className?: string }) {
  const t = useTranslations("status");
  return <span className={`chip chip-${status} ${className}`}>{t(status)}</span>;
}
