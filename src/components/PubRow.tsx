import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PubListItem } from "@/lib/queries";
import { Ago } from "./Ago";
import { LineChip } from "./LineChip";
import { StatusChip } from "./StatusChip";

/** A pub in a list; `visited` marks one the user has checked in at. */
export function PubRow({ pub, visited = false }: { pub: PubListItem; visited?: boolean }) {
  const t = useTranslations("kind");
  const bt = useTranslations("badges");
  return (
    <li>
      <Link
        href={{ pathname: "/pub/[slug]", params: { slug: pub.slug } }}
        className="flex items-center gap-4 px-4 py-3 hover:bg-sign-tint md:px-6"
      >
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="truncate">{pub.name}</span>
            {visited && (
              <span className="flex shrink-0 items-center gap-1 text-[13px] text-sign">
                <CheckIcon strokeWidth={3} className="size-3.5" aria-hidden="true" />
                {bt("visited")}
              </span>
            )}
          </p>
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate">
              {pub.station} · {t(pub.kind)}
            </span>
            {pub.lines.slice(0, 3).map((n) => (
              <LineChip key={n} number={n} className="hidden text-xs sm:inline-flex" />
            ))}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusChip status={pub.status} />
          <span className="font-mono text-xs text-muted-foreground">
            <Ago months={pub.monthsAgo} date={pub.lastConfirmedAt} />
          </span>
        </div>
      </Link>
    </li>
  );
}
