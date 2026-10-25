import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PubListItem } from "@/lib/queries";
import { Ago } from "./Ago";
import { LineChip } from "./LineChip";
import { StatusChip } from "./StatusChip";

export function PubRow({ pub }: { pub: PubListItem }) {
  const t = useTranslations("kind");
  return (
    <li>
      <Link
        href={{ pathname: "/pub/[slug]", params: { slug: pub.slug } }}
        className="flex items-center gap-4 px-4 py-3 hover:bg-sign-tint md:px-6"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{pub.name}</p>
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
