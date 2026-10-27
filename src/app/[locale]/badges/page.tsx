import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { BadgeTile } from "@/components/BadgeTile";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import type { BadgeKind } from "@/lib/badges";
import { listBadges, syncBadges, type BadgeView } from "@/lib/userBadges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("badges");
  return { title: t("title") };
}

const SECTIONS: BadgeKind[] = ["pubs", "region", "line"];

/** Every badge there is; signed in, with the user's levels and the badges started first. */
export default async function BadgesPage({ params }: PageProps<"/[locale]/badges">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const signedIn = Boolean(user && signUpFinished(user));
  if (signedIn) await syncBadges(user!.id);
  const [t, badges] = await Promise.all([getTranslations("badges"), listBadges(locale, signedIn ? user!.id : undefined)]);
  const earned = badges.filter((b) => b.level > 0).length;
  const collator = new Intl.Collator(locale);
  const byStanding = (a: BadgeView, b: BadgeView) =>
    Number(b.complete) - Number(a.complete) ||
    b.level - a.level ||
    (a.kind === "line" ? a.id.localeCompare(b.id) : collator.compare(a.name, b.name));

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")}>
        {signedIn && (
          <p className="font-mono text-[15px] font-semibold text-yellow" data-testid="badge-count">
            {t("count", { count: earned })}
          </p>
        )}
      </PageHero>
      <div className="page-column flex flex-col gap-10 py-8 md:gap-12 md:py-12">
        {!signedIn && (
          <Card className="flex-row flex-wrap items-center justify-between gap-4 p-5 md:p-6">
            <p className="text-[17px]">{t("signedOut")}</p>
            <Link href={{ pathname: "/login", query: { next: getPathname({ locale, href: "/badges" }) } }} className={buttonVariants({ variant: "yellow", size: "xl" })}>
              {t("logIn")}
            </Link>
          </Card>
        )}
        {SECTIONS.map((kind) => {
          const list = badges.filter((b) => b.kind === kind).sort(byStanding);
          return (
            <section key={kind} aria-labelledby={`badges-${kind}`} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id={`badges-${kind}`} className="text-[32px] md:text-4xl">
                  {t(`sections.${kind}`)}
                </h2>
                <p className="max-w-2xl text-[15px] text-muted-foreground">{t(`sectionText.${kind}`)}</p>
              </div>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
                {list.map((b) => (
                  <BadgeTile key={b.key} badge={b} signedIn={signedIn} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
