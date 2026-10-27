import { CheckIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { BADGE_STEP, badgeThresholds, shownLevels, type BadgeKey } from "@/lib/badges";
import { badgeHref } from "@/lib/badgeLinks";
import { TIME_ZONE } from "@/lib/checkin";
import { listPubs } from "@/lib/queries";
import { getBadge, listBadgeLevels, syncBadges } from "@/lib/userBadges";
import { BadgeMedal } from "./BadgeMedal";
import { badgeHeading, medalProps } from "./badgeText";
import { PageHero } from "./PageHero";
import { PubRow } from "./PubRow";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** One badge's page: the medal, the user's progress, every level and the pubs still to visit. */
export async function BadgeDetail({ badgeKey, locale }: { badgeKey: BadgeKey; locale: Locale }) {
  const user = await getCurrentUser();
  const userId = user && signUpFinished(user) ? user.id : undefined;
  if (userId) await syncBadges(userId);
  const badge = await getBadge(badgeKey, locale, userId);
  if (!badge) notFound();
  const [t, format, history] = await Promise.all([getTranslations("badges"), getFormatter(), userId ? listBadgeLevels(userId, badgeKey) : []]);
  const { progress } = badge;
  const heading = badgeHeading(t, badge);
  const thresholds = badgeThresholds(progress.total, BADGE_STEP[badge.kind]);
  const earned = new Map(history.map((h) => [h.level, h]));
  const date = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });

  const toVisit =
    badge.kind === "pubs"
      ? null
      : (await listPubs(badge.kind === "line" ? { line: badge.id } : { region: badge.id })).filter(
          (p) => p.status !== "closed" && !badge.visitedPubIds.has(p.id),
        );

  return (
    <>
      <PageHero eyebrow={t(`kind.${badge.kind}`)} title={heading} subtitle={badge.kind === "line" ? badge.name : t(`sectionText.${badge.kind}`)}>
        <nav aria-label={t("title")} className="order-first text-sm">
          <Link href="/badges" className="text-sign-mist underline underline-offset-2">
            {t("title")}
          </Link>
        </nav>
      </PageHero>

      <div className="page-column flex flex-wrap items-start gap-6 py-8 md:gap-8 md:py-12">
        <Card className="min-w-0 flex-[1_1_300px] items-center gap-5 p-6 text-center">
          <BadgeMedal {...medalProps(t, badge)} size="lg" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-[28px] leading-tight font-bold" data-testid="badge-state">
              {badge.complete ? t("complete") : badge.level ? t("levelOf", { level: badge.level, levels: progress.levels }) : t("locked")}
            </p>
            <p className="font-mono text-sm text-muted-foreground" data-testid="badge-progress">
              {t("progress", { visited: progress.visited, total: progress.total })}
            </p>
          </div>
          {userId ? (
            progress.nextAt && (
              <div className="flex w-full flex-col gap-1.5">
                <Progress value={progress.toNext * 100} aria-hidden="true" className="[&_[data-slot=progress-indicator]]:bg-yellow [&_[data-slot=progress-track]]:h-2.5" />
                <span className="text-[15px] font-semibold">
                  {t("toNext", { count: progress.nextAt - progress.visited, level: progress.level + 1 })}
                </span>
              </div>
            )
          ) : (
            <Link
              href={{ pathname: "/login", query: { next: getPathname({ locale, href: badgeHref(badgeKey) }) } }}
              className={buttonVariants({ variant: "yellow", size: "xl" })}
            >
              {t("cardSignedOut")}
            </Link>
          )}
          {badge.newPubs > 0 && <p className="text-[15px] text-muted-foreground">{t("newPubs", { count: badge.newPubs })}</p>}
          {badge.kind === "line" && (
            <Link href={{ pathname: "/line/[number]", params: { number: badge.id } }} className="link text-[15px]">
              {t("seeLine", { number: badge.id })}
            </Link>
          )}
          {badge.kind === "region" && (
            <Link href={{ pathname: "/region/[slug]", params: { slug: badge.id } }} className="link text-[15px]">
              {t("seeRegion", { name: badge.name })}
            </Link>
          )}
        </Card>

        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-8">
          <section aria-labelledby="levels-title" className="flex flex-col gap-4">
            <h2 id="levels-title" className="text-[28px] md:text-[32px]">
              {t("levelsTitle")}
            </h2>
            <Card render={<ol />} className="gap-0 divide-y divide-rule-soft py-0">
              {shownLevels(thresholds.length, badge.level).map((level, i) => {
                if (typeof level !== "number")
                  return (
                    <li key={`gap-${i}`} className="flex items-center gap-3.5 px-4 py-2 text-sm text-muted-foreground md:px-5">
                      <span aria-hidden="true" className="w-9 text-center font-mono text-lg leading-none">
                        ⋮
                      </span>
                      {t("moreLevels", { count: level.gap })}
                    </li>
                  );
                const n = thresholds[level - 1];
                const last = level === thresholds.length;
                const got = earned.get(level);
                const reached = Boolean(got) || progress.level >= level;
                return (
                  <li key={level} className="flex items-center gap-3.5 px-4 py-3 md:px-5" data-reached={reached || undefined}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-[15px] font-semibold",
                        reached ? (last ? "bg-yellow text-ink" : "bg-ink text-yellow") : "border-2 border-dashed border-unknown text-muted-foreground",
                      )}
                    >
                      {last && reached ? <CheckIcon strokeWidth={3} className="size-4.5" /> : level}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("font-semibold", !reached && "text-muted-foreground")}>
                        {last ? `${t("level", { level })} · ${t("complete")}` : t("level", { level })}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {last ? t("levelNeedsAll") : t("levelNeeds", { count: n })}
                        {got && (
                          <>
                            {" · "}
                            {t("earned", { date: date(got.earnedAt) })}
                            {got.pubName && got.pubSlug && (
                              <>
                                {" "}
                                <Link href={{ pathname: "/pub/[slug]", params: { slug: got.pubSlug } }} className="link">
                                  {t("historyAt", { pub: got.pubName })}
                                </Link>
                              </>
                            )}
                          </>
                        )}
                      </span>
                    </span>
                  </li>
                );
              })}
            </Card>
          </section>

          {toVisit && (
            <section aria-labelledby="to-visit-title" className="flex flex-col gap-4">
              <h2 id="to-visit-title" className="text-[28px] md:text-[32px]">
                {t("toVisit")}
              </h2>
              {toVisit.length ? (
                <Card render={<ul />} className="gap-0 divide-y divide-rule-soft py-0">
                  {toVisit.map((p) => (
                    <PubRow key={p.slug} pub={p} />
                  ))}
                </Card>
              ) : (
                <p className="text-muted-foreground">{t("toVisitNone")}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/** Title and description for a badge page. */
export async function badgeMetadata(badgeKey: BadgeKey, locale: Locale) {
  const badge = await getBadge(badgeKey, locale);
  if (!badge) return {};
  const t = await getTranslations("badges");
  return { title: `${badgeHeading(t, badge)} · ${t("title")}`, description: t(`sectionText.${badge.kind}`) };
}
