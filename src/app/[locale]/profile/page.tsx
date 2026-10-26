import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { getRegionProgress, getUserStats, listVisitedPubs } from "@/lib/checkins";
import { countFriends } from "@/lib/friends";
import { TIME_ZONE } from "@/lib/checkin";
import { getTotals } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { avatarUrl } from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title"), robots: { index: false } };
}

/** The signed-in user's own profile: how much of the station-pub network they have covered. */
export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user || !signUpFinished(user)) {
    redirect(getPathname({ locale, href: { pathname: "/login", query: { next: getPathname({ locale, href: "/profile" }) } } }));
  }

  const [t, ft, format, stats, regions, visited, totals, friendCounts] = await Promise.all([
    getTranslations("profile"),
    getTranslations("friends"),
    getFormatter(),
    getUserStats(user.id),
    getRegionProgress(user.id),
    listVisitedPubs(user.id),
    getTotals(),
    countFriends(user.id),
  ]);
  const date = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });
  const collator = new Intl.Collator(locale);
  const regionName = (r: (typeof regions)[number]) => (locale === "cs" ? r.nameCs : r.nameEn);
  const sortedRegions = [...regions].sort((a, b) => b.visited - a.visited || collator.compare(regionName(a), regionName(b)));

  const numbers = [
    { key: "pubs", n: stats.pubs, total: totals.pubs, color: "text-sign" },
    { key: "checkIns", n: stats.checkIns },
    { key: "stations", n: stats.stations },
    { key: "regions", n: stats.regions, total: regions.length },
    { key: "lines", n: stats.lines },
  ] as const;
  const had = (["beers", "shots", "nonAlcoholic", "food"] as const).filter((k) => stats[k] > 0);
  const picture = avatarUrl(user.id, user.avatarUpdatedAt);

  return (
    <>
      <PageHero
        eyebrow={t("title")}
        title={
          <span className="flex items-center gap-4 md:gap-5">
            <Avatar url={picture} name={user.username ?? "?"} size={72} className="border-[3px] border-white" />
            <span className="min-w-0 break-words">@{user.username}</span>
          </span>
        }
        subtitle={
          <>
            {user.hometown && <span className="block font-semibold text-white">{t("from", { hometown: user.hometown })}</span>}
            {t("memberSince", { date: date(user.createdAt) })}
          </>
        }
      />

      <section aria-label={t("statsTitle")} className="border-b border-rule bg-white py-6 md:py-10">
        <dl className="page-column grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {numbers.map(({ key, n, ...rest }) => (
            // column-reverse keeps <dt> first for screen readers; justify-end lines the numbers up at the top.
            <div key={key} className="flex flex-col-reverse justify-end gap-1" data-testid={`stat-${key}`}>
              <dt className="text-sm text-muted-foreground md:text-base">
                {t(key, { count: n })}
                {"total" in rest && <span className="block font-mono text-xs">{t("outOf", { total: rest.total })}</span>}
              </dt>
              <dd className={`font-display text-5xl leading-none font-bold md:text-[64px] ${"color" in rest ? rest.color : ""}`}>{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="page-column flex flex-col gap-10 py-8 md:py-12">
        {stats.checkIns === 0 ? (
          <Card render={<section />} className="flex flex-col items-start gap-3 p-5 md:p-7">
            <h2 className="text-[28px]">{t("emptyTitle")}</h2>
            <p className="text-muted-foreground">{t("emptyText")}</p>
            <Link href="/pubs" className={buttonVariants({ variant: "yellow", size: "xl" })}>
              {t("emptyCta")}
            </Link>
          </Card>
        ) : (
          <>
            {had.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-[28px] md:text-[32px]">{t("hadTitle")}</h2>
                <ul className="flex flex-wrap gap-2">
                  {had.map((k) => (
                    <Badge key={k} variant="secondary" render={<li />} className="h-auto px-3.5 py-1.5 text-base font-semibold">
                      {t(k, { count: stats[k] })}
                    </Badge>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap items-start gap-10">
              <section className="flex min-w-0 flex-[999_1_480px] flex-col gap-4" aria-labelledby="visited-title">
                <h2 id="visited-title" className="text-[28px] md:text-[32px]">
                  {t("visitedTitle")}
                </h2>
                <Card render={<ul />} className="gap-0 divide-y divide-rule-soft py-0">
                  {visited.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-platform md:px-5"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="font-semibold">{p.name}</span>
                          <span className="text-sm text-muted-foreground">{p.station}</span>
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {t("visits", { count: p.visits })}
                          {p.last && <> · {t("lastVisit", { date: date(new Date(p.last)) })}</>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </Card>
              </section>

              <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-4" aria-labelledby="regions-title">
                <h2 id="regions-title" className="text-[28px] md:text-[32px]">
                  {t("regionsTitle")}
                </h2>
                <Card render={<ul />} className="flex flex-col gap-3.5 p-4 md:p-5">
                  {sortedRegions.map((r) => (
                    <li key={r.slug} className="flex flex-col gap-1.5">
                      <span className="flex items-baseline justify-between gap-3 text-[15px]">
                        <span className={r.visited ? "font-semibold" : "text-muted-foreground"}>{regionName(r)}</span>
                        <span className="font-mono text-xs text-muted-foreground">{t("regionProgress", { visited: r.visited, total: r.total })}</span>
                      </span>
                      <Progress
                        value={r.total ? (r.visited / r.total) * 100 : 0}
                        aria-hidden="true"
                        className="[&_[data-slot=progress-indicator]]:bg-yellow [&_[data-slot=progress-track]]:h-2"
                      />
                    </li>
                  ))}
                </Card>
              </section>
            </div>
          </>
        )}
        <Card render={<section aria-labelledby="friends-title" />} className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-7">
          <div className="flex flex-col gap-1">
            <h2 id="friends-title" className="text-[28px] md:text-[32px]">
              {ft("profileTitle")}
            </h2>
            <p className="text-muted-foreground">
              {ft("profileFriends", { count: friendCounts.friends })}
              {friendCounts.incoming > 0 && (
                <span className="block font-semibold text-foreground">{ft("profileRequests", { count: friendCounts.incoming })}</span>
              )}
            </p>
          </div>
          <Link href="/friends" className={buttonVariants({ variant: friendCounts.incoming > 0 ? "yellow" : "outline", size: "xl" })}>
            {ft("profileLink")}
          </Link>
        </Card>
        <ProfileForm username={user.username ?? ""} hometown={user.hometown} avatarUrl={picture} />
      </div>
    </>
  );
}
