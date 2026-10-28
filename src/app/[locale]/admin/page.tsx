import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Avatar } from "@/components/Avatar";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { ROLES } from "@/lib/auth/roles";
import { dashboardStats, listActivity, listUsersForAdmin, type ActivityRow } from "@/lib/adminDashboard";
import {
  ACTIVE_DAYS,
  ACTIVITY_KINDS,
  ACTIVITY_RANGES,
  USER_STATUSES,
  USERS_PAGE,
  dashboardQuery,
  parseDashboardFilters,
  type DashboardFilters,
} from "@/lib/adminFilters";
import { parseBadgeKey } from "@/lib/badges";
import { TIME_ZONE } from "@/lib/checkin";
import { cn } from "@/lib/utils";
import { AdminTabs } from "./AdminTabs";
import { requireAdminPage } from "./guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminDashboard");
  return { title: t("title"), robots: { index: false } };
}

const STATUS_BADGE = { active: "open", inactive: "unknown", unfinished: "closed" } as const;

/**
 * The admin dashboard: totals, every user filtered by status and role, and a feed of what
 * happened in the app. All filters live in the query string, so a view can be shared or bookmarked.
 */
export default async function AdminDashboardPage({ params, searchParams }: PageProps<"/[locale]/admin">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const filters = parseDashboardFilters(await searchParams);
  await requireAdminPage(locale, getPathname({ locale, href: { pathname: "/admin", query: dashboardQuery(filters) } }));

  const [t, at, bt, rt, format, stats, users, activity] = await Promise.all([
    getTranslations("adminDashboard"),
    getTranslations("auth"),
    getTranslations("badges"),
    getTranslations("report"),
    getFormatter(),
    dashboardStats(),
    listUsersForAdmin(filters.users),
    listActivity(filters.activity),
  ]);

  const when = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
  const day = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });

  /** A link to the dashboard with some filters changed; changing a filter goes back to its first page. */
  const href = (change: { users?: Partial<DashboardFilters["users"]>; activity?: Partial<DashboardFilters["activity"]> }) =>
    ({
      pathname: "/admin",
      query: dashboardQuery({
        users: { ...filters.users, ...(change.users ? { page: 1 } : {}), ...change.users },
        activity: { ...filters.activity, ...(change.activity ? { page: 1 } : {}), ...change.activity },
      }),
    }) as const;
  /** The other section's filters, kept as hidden fields when one section's search form is sent. */
  const keep = (section: "users" | "activity") =>
    Object.entries(dashboardQuery(section === "users" ? { users: { ...filters.users, q: "", page: 1 }, activity: filters.activity } : { users: filters.users, activity: { ...filters.activity, q: "", page: 1 } }))
      .filter(([k]) => (section === "users" ? k !== "role" : true))
      .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const chip = (active: boolean) => cn(buttonVariants({ variant: active ? "ink" : "outline", size: "sm" }), "h-9 px-3");

  const fromUser = users.total === 0 ? 0 : (filters.users.page - 1) * USERS_PAGE + 1;
  const toUser = Math.min(filters.users.page * USERS_PAGE, users.total);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")}>
        <AdminTabs current="dashboard" />
      </PageHero>
      <div className="page-column flex flex-col gap-12 py-8 md:py-12">
        <section aria-labelledby="stats-title" className="flex flex-col gap-4">
          <h2 id="stats-title" className="sr-only">
            {t("statsTitle")}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Stat label={t("statUsers")} value={stats.users} note={t("statUsersNote", { count: stats.unfinished })} />
            <Stat label={t("statNewUsers")} value={stats.newUsersWeek} note={t("statNewUsersNote")} />
            <Stat label={t("statCheckins")} value={stats.checkinsWeek} note={t("statCheckinsNote", { count: stats.checkinUsersWeek })} />
            <Stat label={t("statReports")} value={stats.openReports} link={{ href: "/moderation", text: t("statOpenQueue") }} highlight={stats.openReports > 0} />
            <Stat
              label={t("statSuggestions")}
              value={stats.pendingSuggestions}
              link={{ href: "/moderation", text: t("statOpenQueue") }}
              highlight={stats.pendingSuggestions > 0}
            />
          </ul>
        </section>

        <section aria-labelledby="users-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="users-title" className="text-[28px] md:text-[32px]">
              {t("usersTitle")}
            </h2>
            <p className="text-muted-foreground">{t("usersSubtitle", { count: users.total, days: ACTIVE_DAYS })}</p>
          </div>
          <div className="flex flex-col gap-3">
            <nav aria-label={t("filterStatus")} className="flex flex-wrap gap-2">
              <Link href={href({ users: { status: null } })} aria-current={!filters.users.status ? "page" : undefined} className={chip(!filters.users.status)}>
                {t("filterAll")}
              </Link>
              {USER_STATUSES.map((st) => (
                <Link key={st} href={href({ users: { status: st } })} aria-current={filters.users.status === st ? "page" : undefined} className={chip(filters.users.status === st)}>
                  {t(`status.${st}`)}
                </Link>
              ))}
            </nav>
            <form role="search" aria-label={t("usersTitle")} className="flex flex-wrap gap-2">
              {keep("users")}
              <NativeSelect name="role" defaultValue={filters.users.role ?? ""} aria-label={t("filterRole")}>
                <NativeSelectOption value="">{t("allRoles")}</NativeSelectOption>
                {ROLES.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {at(`roles.${r}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input type="search" name="uq" defaultValue={filters.users.q} aria-label={t("usersSearch")} placeholder={t("usersSearch")} className="order-first min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto sm:max-w-sm" />
              <Button type="submit" variant="outline" size="xl" className="h-11.5">
                {t("searchButton")}
              </Button>
            </form>
          </div>
          {users.rows.length === 0 ? (
            <Card render={<p />} className="p-5 text-muted-foreground">
              {t("noUsers")}
            </Card>
          ) : (
            <Card className="py-0">
              <Table aria-labelledby="users-title">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">{t("colUser")}</TableHead>
                    <TableHead>{t("colRole")}</TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                    <TableHead className="text-right">{t("colCheckins")}</TableHead>
                    <TableHead>{t("colLastActive")}</TableHead>
                    <TableHead className="pr-4">{t("colJoined")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.rows.map((u) => {
                    const label = u.username ? `@${u.username}` : (u.name ?? u.email ?? "?");
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar url={u.avatarUrl} name={label} size={32} />
                            <div className="flex min-w-0 flex-col">
                              <span className="font-semibold">{u.username ? `@${u.username}` : <span className="text-muted-foreground italic">{t("noUsername")}</span>}</span>
                              <span className="truncate text-xs text-muted-foreground">{[u.name, u.email].filter(Boolean).join(" · ")}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{u.role === "user" ? <span className="text-muted-foreground">{at("roles.user")}</span> : <Badge variant="secondary">{at(`roles.${u.role}`)}</Badge>}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[u.status]}>{t(`status.${u.status}`)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{u.checkins}</TableCell>
                        <TableCell className="font-mono text-xs">{u.lastActiveAt ? when(u.lastActiveAt) : <span className="text-muted-foreground">{t("never")}</span>}</TableCell>
                        <TableCell className="pr-4 font-mono text-xs">{day(u.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
          {users.total > 0 && (
            <Pager
              label={t("showing", { from: fromUser, to: toUser, total: users.total })}
              prev={filters.users.page > 1 ? { href: href({ users: { page: filters.users.page - 1 } }), text: t("previous") } : null}
              next={toUser < users.total ? { href: href({ users: { page: filters.users.page + 1 } }), text: t("next") } : null}
            />
          )}
        </section>

        <section aria-labelledby="activity-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="activity-title" className="text-[28px] md:text-[32px]">
              {t("activityTitle")}
            </h2>
            <p className="text-muted-foreground">{t("activitySubtitle")}</p>
          </div>
          <div className="flex flex-col gap-3">
            <nav aria-label={t("filterKind")} className="flex flex-wrap gap-2">
              <Link href={href({ activity: { kind: null } })} aria-current={!filters.activity.kind ? "page" : undefined} className={chip(!filters.activity.kind)}>
                {t("allKinds")}
              </Link>
              {ACTIVITY_KINDS.map((k) => (
                <Link key={k} href={href({ activity: { kind: k } })} aria-current={filters.activity.kind === k ? "page" : undefined} className={chip(filters.activity.kind === k)}>
                  {t(`kinds.${k}`)}
                </Link>
              ))}
            </nav>
            <nav aria-label={t("filterRange")} className="flex flex-wrap gap-2">
              {ACTIVITY_RANGES.map((r) => (
                <Link key={r} href={href({ activity: { range: r } })} aria-current={filters.activity.range === r ? "page" : undefined} className={chip(filters.activity.range === r)}>
                  {t(`ranges.${r}`)}
                </Link>
              ))}
            </nav>
            <form role="search" aria-label={t("activityTitle")} className="flex flex-wrap gap-2">
              {keep("activity")}
              <Input type="search" name="q" defaultValue={filters.activity.q} aria-label={t("activitySearch")} placeholder={t("activitySearch")} className="order-first min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto sm:max-w-sm" />
              <Button type="submit" variant="outline" size="xl" className="h-11.5">
                {t("searchButton")}
              </Button>
            </form>
          </div>
          {activity.rows.length === 0 ? (
            <Card render={<p />} className="p-5 text-muted-foreground">
              {t("noActivity")}
            </Card>
          ) : (
            <Card render={<ul aria-labelledby="activity-title" />} className="gap-0 divide-y divide-rule-soft py-0">
              {activity.rows.map((a, i) => (
                <li key={`${a.kind}-${i}-${a.at.getTime()}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 md:px-5">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground sm:w-40">{when(a.at)}</span>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Badge variant="secondary" className="self-center">
                      {t(`kinds.${a.kind}`)}
                    </Badge>
                    <span className="font-semibold">{a.username ? `@${a.username}` : <span className="text-muted-foreground">{a.userId ? (a.email ?? t("unknownUser")) : a.kind === "suggestion" ? t("anonymous") : t("unknownUser")}</span>}</span>
                    <ActivityWhat row={a} t={t} bt={bt} rt={rt} />
                  </span>
                </li>
              ))}
            </Card>
          )}
          {(filters.activity.page > 1 || activity.hasMore) && (
            <Pager
              label={null}
              prev={filters.activity.page > 1 ? { href: href({ activity: { page: filters.activity.page - 1 } }), text: t("newer") } : null}
              next={activity.hasMore ? { href: href({ activity: { page: filters.activity.page + 1 } }), text: t("older") } : null}
            />
          )}
        </section>
      </div>
    </>
  );
}

type Href = React.ComponentProps<typeof Link>["href"];

function Stat({ label, value, note, link, highlight }: { label: string; value: number; note?: string; link?: { href: Href; text: string }; highlight?: boolean }) {
  return (
    <Card render={<li />} className={cn("flex flex-col gap-1 p-4 md:p-5", highlight && "ring-2 ring-yellow")}>
      <span className="label">{label}</span>
      <span className="font-display text-4xl font-bold">{value}</span>
      {note && <span className="text-sm text-muted-foreground">{note}</span>}
      {link && (
        <Link href={link.href} className="text-sm font-semibold text-primary hover:underline">
          {link.text}
        </Link>
      )}
    </Card>
  );
}

function Pager({ label, prev, next }: { label: string | null; prev: { href: Href; text: string } | null; next: { href: Href; text: string } | null }) {
  const button = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 px-3");
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <span className="flex gap-2">
        {prev && (
          <Link href={prev.href} className={button}>
            {prev.text}
          </Link>
        )}
        {next && (
          <Link href={next.href} className={button}>
            {next.text}
          </Link>
        )}
      </span>
    </nav>
  );
}

type T<N extends "adminDashboard" | "badges" | "report"> = Awaited<ReturnType<typeof getTranslations<N>>>;

/** What an activity was about: the pub, the badge, the suggestion's text. */
function ActivityWhat({ row: a, t, bt, rt }: { row: ActivityRow; t: T<"adminDashboard">; bt: T<"badges">; rt: T<"report"> }) {
  const muted = "text-muted-foreground";
  const pub = a.subject && (a.slug ? (
    <Link href={{ pathname: "/pub/[slug]", params: { slug: a.slug } }} className="hover:underline">
      {a.subject}
    </Link>
  ) : (
    <span>{a.subject}</span>
  ));
  switch (a.kind) {
    case "signup":
      return null;
    case "checkin": {
      const [beers, shots] = (a.detail ?? "0/0").split("/").map(Number);
      return (
        <>
          {pub}
          <span className={muted}>· {t("drinks", { beers, shots })}</span>
        </>
      );
    }
    case "report":
      return (
        <>
          {pub}
          {a.detail && <span className={muted}>· {rt(`kinds.${a.detail as "other"}`)}</span>}
        </>
      );
    case "suggestion":
      return <span className={cn(muted, "line-clamp-2 basis-full")}>“{a.detail}”</span>;
    case "friend":
      return (
        <span className={muted}>
          {t("friendTo", { username: a.subject ?? "?" })} · {t(`friendStatus.${(a.detail ?? "pending") as "pending"}`)}
        </span>
      );
    case "badge": {
      const key = a.slug ? parseBadgeKey(a.slug) : null;
      const name = key?.kind === "line" ? bt("lineName", { number: key.id }) : key?.kind === "region" ? (a.subject ?? key.id) : bt("pubsName");
      return (
        <>
          <span>{name}</span>
          <span className={muted}>· {a.detail === "complete" ? bt("complete") : bt("level", { level: Number(a.detail) })}</span>
        </>
      );
    }
    case "pubDeleted":
      return pub;
  }
}
