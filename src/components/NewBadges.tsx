import { getLocale, getTranslations } from "next-intl/server";
import { asLocale } from "@/i18n/routing";
import { badgeHref } from "@/lib/badgeLinks";
import { listBadges, listUnseenBadges } from "@/lib/userBadges";
import { badgeHeading, badgeState, medalProps } from "./badgeText";
import { NewBadgesDialog } from "./NewBadgesDialog";

/** The "new badge" popup, when the user has levels they haven't seen yet. */
export async function NewBadges({ userId }: { userId: string }) {
  const unseen = await listUnseenBadges(userId);
  if (!unseen.length) return null;
  const [t, locale] = await Promise.all([getTranslations("badges"), getLocale()]);
  const badges = new Map((await listBadges(asLocale(locale), userId)).map((b) => [b.key, b]));
  const items = unseen.flatMap((u) => {
    const b = badges.get(u.key);
    if (!b) return [];
    // The level the popup is about, which may be below one reached since.
    const shown = { ...b, level: u.level, complete: u.complete };
    return [
      {
        key: u.key,
        ids: u.ids,
        heading: badgeHeading(t, b),
        state: badgeState(t, shown),
        href: badgeHref(u.key),
        // The level just reached sweeps round in colour.
        medal: { ...medalProps(t, shown), fill: 1, fillFrom: 0, rememberAs: undefined },
      },
    ];
  });
  return items.length ? <NewBadgesDialog items={items} /> : null;
}
