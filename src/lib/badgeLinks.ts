import { parseBadgeKey, type BadgeKey } from "./badges";

/** The page of one badge. */
export function badgeHref(key: BadgeKey) {
  const { kind, id } = parseBadgeKey(key)!;
  if (kind === "line") return { pathname: "/badges/line/[number]", params: { number: id } } as const;
  if (kind === "region") return { pathname: "/badges/region/[slug]", params: { slug: id } } as const;
  return "/badges/pubs" as const;
}
