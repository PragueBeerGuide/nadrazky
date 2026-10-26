import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canModerate } from "@/lib/auth/roles";
import { TIME_ZONE } from "@/lib/checkin";
import { listOpenReports, listResolvedReports, type ReportRow } from "@/lib/reports";
import { decideReport } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return { title: t("title"), robots: { index: false } };
}

/** The moderation queue: reports from regular users waiting for a moderator or admin. */
export default async function ModerationPage({ params }: PageProps<"/[locale]/moderation">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(getPathname({ locale, href: { pathname: "/login", query: { next: getPathname({ locale, href: "/moderation" }) } } }));
  if (!canModerate(user.role)) notFound();

  const [t, rt, st, format, open, resolved] = await Promise.all([
    getTranslations("moderation"),
    getTranslations("report"),
    getTranslations("status"),
    getFormatter(),
    listOpenReports(),
    listResolvedReports(),
  ]);
  const when = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

  /** What the pub shows now for the field a report would change. */
  const currentValue = (r: ReportRow) => {
    switch (r.kind) {
      case "name":
        return r.pub.name;
      case "hours":
        return r.pub.openingHours;
      case "address":
        return r.pub.address;
      case "beers":
        return r.pub.beers;
      case "closed":
      case "reopened":
        return st(r.pub.status);
      default:
        return null;
    }
  };

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle", { count: open.length })} />
      <div className="page-column flex flex-col gap-10 py-8 *:max-w-3xl md:py-12">
        {open.length === 0 ? (
          <Card render={<p />} className="p-5 md:p-7">{t("empty")}</Card>
        ) : (
          <ul aria-label={t("openTitle")} className="flex flex-col gap-4">
            {open.map((r) => {
              const now = currentValue(r);
              return (
                <Card render={<li />} key={r.id} className="flex flex-col gap-4 p-5 md:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link href={{ pathname: "/pub/[slug]", params: { slug: r.pub.slug } }} className="text-lg font-semibold hover:underline">
                      {r.pub.name} <span className="font-normal text-muted-foreground">· {r.station}</span>
                    </Link>
                    <Badge variant="secondary" className="h-auto px-3 py-0.5 text-sm font-semibold">
                      {rt(`kinds.${r.kind}`)}
                    </Badge>
                  </div>
                  {(r.value || now) && (
                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {r.value && (
                        <div className="flex flex-col gap-0.5">
                          <dt className="label">{t("proposed")}</dt>
                          <dd className="font-semibold">{r.value}</dd>
                        </div>
                      )}
                      {now && (
                        <div className="flex flex-col gap-0.5">
                          <dt className="label">{t("current")}</dt>
                          <dd className="text-muted-foreground">{now}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {r.message && <p className="rounded-lg bg-platform px-4 py-3 text-[15px]">{r.message}</p>}
                  {(r.kind === "location" || r.kind === "other") && <p className="text-sm text-muted-foreground">{t(`byHand.${r.kind}`)}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft pt-4">
                    <span className="font-mono text-xs text-muted-foreground">{t("reportedBy", { username: r.reporter ?? "?", date: when(r.createdAt) })}</span>
                    <form action={decideReport} className="flex gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <Button variant="outline" size="xl" type="submit" name="decision" value="reject" className="h-11">
                        {t("reject")}
                      </Button>
                      <Button size="xl" type="submit" name="decision" value="accept" className="h-11">
                        {t("approve")}
                      </Button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}

        {resolved.length > 0 && (
          <section className="flex flex-col gap-4" aria-labelledby="resolved-title">
            <h2 id="resolved-title" className="text-[28px] md:text-[32px]">
              {t("resolvedTitle")}
            </h2>
            <Card render={<ul />} className="gap-0 divide-y divide-rule-soft py-0">
              {resolved.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 md:px-5">
                  <span className="min-w-0">
                    <Link href={{ pathname: "/pub/[slug]", params: { slug: r.pub.slug } }} className="font-semibold hover:underline">
                      {r.pub.name}
                    </Link>
                    <span className="text-muted-foreground"> · {rt(`kinds.${r.kind}`)}</span>
                    {r.value && <span className="text-muted-foreground"> · {r.value}</span>}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <Badge variant={r.status === "accepted" ? "open" : "closed"}>
                      {r.status === "accepted" ? t("accepted") : t("rejected")}
                    </Badge>
                    {r.autoApproved ? t("auto", { username: r.reporter ?? "?" }) : t("resolvedBy", { username: r.resolver ?? "?" })}
                    {r.resolvedAt && <> · {when(r.resolvedAt)}</>}
                  </span>
                </li>
              ))}
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
