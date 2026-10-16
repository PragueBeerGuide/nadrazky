import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PubListItem } from "@/lib/queries";
import { StatusChip } from "./StatusChip";

export function PubRow({ pub }: { pub: PubListItem }) {
  const t = useTranslations("kind");
  return (
    <li>
      <Link
        href={{ pathname: "/pub/[slug]", params: { slug: pub.slug } }}
        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent"
      >
        <div className="min-w-0">
          <p className="board truncate text-lg font-semibold text-primary">{pub.station}</p>
          <p className="truncate text-sm text-foreground">
            {pub.name} <span className="text-primary/70">· {t(pub.kind)}</span>
          </p>
        </div>
        <StatusChip status={pub.status} />
      </Link>
    </li>
  );
}
