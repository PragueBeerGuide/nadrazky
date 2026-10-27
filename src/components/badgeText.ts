import type { getTranslations } from "next-intl/server";
import type { BadgeKind } from "@/lib/badges";

type T = Awaited<ReturnType<typeof getTranslations<"badges">>>;
type Shown = { key?: string; kind: BadgeKind; id: string; name: string; level: number; complete: boolean };

/** The badge's name in headings: "Line 010", the region, or "Nádražák". */
export function badgeHeading(t: T, b: Pick<Shown, "kind" | "id" | "name">) {
  if (b.kind === "line") return t("lineName", { number: b.id });
  if (b.kind === "region") return b.name;
  return t("pubsName");
}

/** Where the user stands on it in words: its level, complete, or not started. */
export function badgeState(t: T, b: Pick<Shown, "level" | "complete">) {
  if (b.complete) return t("complete");
  return b.level ? t("level", { level: b.level }) : t("locked");
}

/** A region's name on its medal: the caption already says "Region", so "Středočeský kraj" shows as "Středočeský". */
export function medalRegionName(name: string) {
  return name.replace(/\s+(kraj|Region)$/, "");
}

/** The props for a BadgeMedal of this badge, coloured in as far as the way to its next level. */
export function medalProps(t: T, b: Shown & { progress?: { toNext: number } }) {
  return {
    kind: b.kind,
    label: t(`kind.${b.kind}`),
    title: b.kind === "line" ? b.id : b.kind === "region" ? medalRegionName(b.name) : t("pubsName"),
    level: b.level,
    complete: b.complete,
    fill: b.progress?.toNext ?? 0,
    rememberAs: b.key,
    levelLabel: `${badgeHeading(t, b)}: ${badgeState(t, b)}`,
  };
}
