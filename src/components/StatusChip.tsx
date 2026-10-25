import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PubStatus } from "@/lib/queries";

export function StatusChip({ status, className }: { status: PubStatus; className?: string }) {
  const t = useTranslations("status");
  return (
    <Badge variant={status} data-status={status} className={className}>
      {t(status)}
    </Badge>
  );
}
