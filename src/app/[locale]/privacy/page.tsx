import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { asLocale } from "@/i18n/routing";
import { DATA_CONTROLLER, PRIVACY_UPDATED } from "@/lib/privacy";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

const { name, email } = DATA_CONTROLLER;

/** Formatting for the rich texts in messages/*.json under "privacy". */
const tags = {
  email: () => (
    <a href={`mailto:${email}`} className="link">
      {email}
    </a>
  ),
  uoou: (chunks: React.ReactNode) => (
    <a href="https://uoou.gov.cz" className="link">
      {chunks}
    </a>
  ),
  strong: (chunks: React.ReactNode) => <strong className="font-semibold">{chunks}</strong>,
  code: (chunks: React.ReactNode) => <code className="rounded bg-sign-tint px-1 font-mono text-[0.88em]">{chunks}</code>,
};

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations("privacy");
  const format = await getFormatter();
  const date = format.dateTime(new Date(`${PRIVACY_UPDATED}T12:00:00Z`), { dateStyle: "long" });

  const sections: { id: string; title: string; body: React.ReactNode }[] = [
    { id: "controller", title: t("controller.title"), body: <p>{t.rich("controller.p1", { ...tags, name })}</p> },
    {
      id: "browsing",
      title: t("browsing.title"),
      body: (
        <>
          <p>{t("browsing.p1")}</p>
          <List items={[t.rich("browsing.logs", tags), t.rich("browsing.map", tags), t.rich("browsing.language", tags)]} />
        </>
      ),
    },
    {
      id: "account",
      title: t("account.title"),
      body: (
        <>
          <p>{t("account.p1")}</p>
          <p>{t("account.p2")}</p>
          <p>{t("account.p3")}</p>
        </>
      ),
    },
    {
      id: "checkins",
      title: t("checkins.title"),
      body: (
        <>
          <p>{t("checkins.p1")}</p>
          <p>{t("checkins.p2")}</p>
          <p>{t("checkins.p3")}</p>
        </>
      ),
    },
    { id: "reports", title: t("reports.title"), body: <p>{t("reports.p1")}</p> },
    {
      id: "friends",
      title: t("friends.title"),
      body: (
        <>
          <p>{t("friends.p1")}</p>
          <p>{t("friends.p2")}</p>
        </>
      ),
    },
    {
      id: "cookies",
      title: t("cookies.title"),
      body: (
        <>
          <p>{t("cookies.p1")}</p>
          <List items={[t.rich("cookies.session", tags), t.rich("cookies.language", tags)]} />
        </>
      ),
    },
    {
      id: "basis",
      title: t("basis.title"),
      body: <List items={[t("basis.account"), t("basis.logs")]} />,
    },
    {
      id: "processors",
      title: t("processors.title"),
      body: (
        <>
          <p>{t("processors.p1")}</p>
          <List
            items={[
              t.rich("processors.vercel", tags),
              t.rich("processors.neon", tags),
              t.rich("processors.google", tags),
              t.rich("processors.openfreemap", tags),
            ]}
          />
          <p>{t("processors.p2")}</p>
        </>
      ),
    },
    {
      id: "retention",
      title: t("retention.title"),
      body: <List items={[t("retention.account"), t("retention.session"), t("retention.logs")]} />,
    },
    {
      id: "rights",
      title: t("rights.title"),
      body: (
        <>
          <p>{t.rich("rights.p1", tags)}</p>
          <p>{t.rich("rights.p2", tags)}</p>
        </>
      ),
    },
    { id: "age", title: t("age.title"), body: <p>{t("age.p1")}</p> },
    { id: "changes", title: t("changes.title"), body: <p>{t("changes.p1")}</p> },
  ];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle", { date })} />
      <div className="page-column flex flex-col gap-10 py-10 *:max-w-2xl md:py-14">
        <Card render={<section />} aria-labelledby="summary" className="flex flex-col gap-4 p-5 md:p-7">
          <h2 id="summary" className="text-[28px]">
            {t("summaryTitle")}
          </h2>
          <List items={[t("summary.browse"), t("summary.google"), t("summary.checkins"), t("summary.public")]} />
        </Card>
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-6 flex-col gap-3 text-[17px] leading-relaxed">
            <h2 id={`${s.id}-title`} className="text-[28px] md:text-[32px]">
              {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>
    </>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-[0.6em] size-2 shrink-0 rounded-full bg-yellow" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
