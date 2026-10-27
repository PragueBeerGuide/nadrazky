import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { badgeHref } from "@/lib/badgeLinks";
import type { BadgeView } from "@/lib/userBadges";
import { BadgeMedal } from "./BadgeMedal";
import { medalProps } from "./badgeText";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** The badge of a line or region beside its pubs: the user's level and pubs to the next one. */
export async function BadgeCard({ badge, signedIn, title }: { badge: BadgeView; signedIn: boolean; title: string }) {
  const t = await getTranslations("badges");
  const { progress } = badge;
  return (
    <Card render={<section aria-labelledby="badge-card-title" />} className="items-center gap-4 p-6 text-center" data-testid="badge-card">
      <BadgeMedal {...medalProps(t, badge)} />
      <div className="flex flex-col gap-1">
        <h2 id="badge-card-title" className="text-[28px]">
          {title}
        </h2>
        <p className="font-mono text-[13px] text-muted-foreground">
          {badge.complete ? t("complete") : badge.level ? t("levelOf", { level: badge.level, levels: progress.levels }) : t("locked")}
          {" · "}
          {t("progress", { visited: progress.visited, total: progress.total })}
        </p>
      </div>
      {signedIn && progress.nextAt && (
        <div className="flex w-full flex-col gap-1.5">
          <Progress value={progress.toNext * 100} aria-hidden="true" className="[&_[data-slot=progress-indicator]]:bg-yellow [&_[data-slot=progress-track]]:h-2.5" />
          <span className="text-[15px]">{t("toNext", { count: progress.nextAt - progress.visited, level: progress.level + 1 })}</span>
        </div>
      )}
      {signedIn ? (
        <Link href={badgeHref(badge.key)} className="link text-[15px]">
          {t("badgeLink")}
        </Link>
      ) : (
        <Link href={badgeHref(badge.key)} className={buttonVariants({ variant: "yellow", size: "lg" })}>
          {t("cardSignedOut")}
        </Link>
      )}
    </Card>
  );
}
