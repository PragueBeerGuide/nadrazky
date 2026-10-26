import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Avatar } from "@/components/Avatar";
import { PageHero } from "@/components/PageHero";
import { getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { searchTerm } from "@/lib/friend";
import { listFriendships, searchUsers, type FriendUser } from "@/lib/friends";
import { FriendActions } from "./FriendActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("friends");
  return { title: t("title"), robots: { index: false } };
}

/** Finding other users by username, friend requests both ways and the user's friends. */
export default async function FriendsPage({ params, searchParams }: PageProps<"/[locale]/friends">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user || !signUpFinished(user)) {
    redirect(getPathname({ locale, href: { pathname: "/login", query: { next: getPathname({ locale, href: "/friends" }) } } }));
  }

  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const term = searchTerm(query);
  const [t, { incoming, outgoing, friends }, results] = await Promise.all([
    getTranslations("friends"),
    listFriendships(user.id),
    term ? searchUsers(user.id, term) : null,
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle", { count: friends.length })} />
      <div className="page-column flex flex-col gap-10 py-8 *:max-w-2xl md:py-12">
        <section className="flex flex-col gap-4" aria-labelledby="search-title">
          <h2 id="search-title" className="text-[28px] md:text-[32px]">
            {t("searchTitle")}
          </h2>
          <Card render={<form role="search" />} className="flex flex-col gap-3 p-4 md:p-5">
            <Label htmlFor="friend-search" className="font-semibold">
              {t("searchLabel")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="friend-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder={t("searchPlaceholder")}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <Button type="submit" size="xl" className="h-11.5">
                {t("search")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("searchHint")}</p>
          </Card>
          {query && !term && <p className="text-muted-foreground">{t("searchInvalid")}</p>}
          {results &&
            (results.length === 0 ? (
              <p className="text-muted-foreground">{t("noResults", { query: term! })}</p>
            ) : (
              <People label={t("resultsTitle")} people={results} />
            ))}
        </section>

        {incoming.length > 0 && (
          <section className="flex flex-col gap-4" aria-labelledby="incoming-title">
            <h2 id="incoming-title" className="text-[28px] md:text-[32px]">
              {t("incomingTitle")}
            </h2>
            <People people={incoming} />
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="flex flex-col gap-4" aria-labelledby="outgoing-title">
            <h2 id="outgoing-title" className="text-[28px] md:text-[32px]">
              {t("outgoingTitle")}
            </h2>
            <People people={outgoing} />
          </section>
        )}

        <section className="flex flex-col gap-4" aria-labelledby="friends-title">
          <h2 id="friends-title" className="text-[28px] md:text-[32px]">
            {t("friendsTitle")}
          </h2>
          {friends.length === 0 ? (
            <Card render={<p />} className="p-5 text-muted-foreground md:p-6">
              {t("noFriends")}
            </Card>
          ) : (
            <People people={friends} removable />
          )}
        </section>
      </div>
    </>
  );
}

function People({ people, label, removable }: { people: FriendUser[]; label?: string; removable?: boolean }) {
  return (
    <Card render={<ul aria-label={label} />} className="gap-0 divide-y divide-rule-soft py-0">
      {people.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:px-5">
          <span className="flex min-w-0 items-center gap-3">
            <Avatar url={p.avatarUrl} name={p.username} size={40} />
            <span className="min-w-0 font-semibold break-words">@{p.username}</span>
          </span>
          <FriendActions userId={p.id} username={p.username} relation={p.relation} removable={removable} />
        </li>
      ))}
    </Card>
  );
}
