import { useTranslations } from "next-intl";
import type { PubStatus } from "@/lib/queries";

const cls: Record<PubStatus, string> = {
  open: "chip-open",
  maybe_open: "chip-maybe",
  unknown: "chip-unknown",
  closed: "chip-closed",
};

export function StatusChip({ status }: { status: PubStatus }) {
  const t = useTranslations("status");
  return <span className={`chip ${cls[status]}`}>{t(status)}</span>;
}
