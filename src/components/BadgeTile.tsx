import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { badgeHref } from "@/lib/badgeLinks";
import type { BadgeView } from "@/lib/userBadges";
import { BadgeMedal } from "./BadgeMedal";
import { badgeHeading, medalProps } from "./badgeText";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A badge in a grid: its medal, name and how far the user has got, linking to its page. */
export async function BadgeTile({ badge, signedIn }: { badge: BadgeView; signedIn: boolean }) {
  const t = await getTranslations("badges");
  const { progress } = badge;
  return (
    <li>
      <Card
        render={<Link href={badgeHref(badge.key)} />}
        className="h-full items-center gap-2.5 rounded-xl px-3 pt-4 pb-3.5 text-center hover:border-sign"
      >
        <BadgeMedal {...medalProps(t, badge)} size="sm" />
        <span className="mt-1 flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] leading-tight font-semibold">{badgeHeading(t, badge)}</span>
          {badge.kind === "line" && <span className="line-clamp-2 text-xs text-muted-foreground">{badge.name}</span>}
          <span className={cn("font-mono text-xs", badge.level ? "text-sign" : "text-muted-foreground")}>
            {signedIn ? t("progress", { visited: progress.visited, total: progress.total }) : t("levelNeeds", { count: progress.total })}
          </span>
        </span>
      </Card>
    </li>
  );
}
