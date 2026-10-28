"use client";

import { HouseIcon, LightbulbIcon, MapIcon, TextAlignStartIcon, TrainTrackIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { sectionOf } from "./section";
import { SuggestionDialog } from "./SuggestionButton";

const items = [
  { href: "/", key: "home", Icon: HouseIcon },
  { href: "/map", key: "map", Icon: MapIcon },
  { href: "/pubs", key: "pubs", Icon: TextAlignStartIcon },
  { href: "/lines", key: "lines", Icon: TrainTrackIcon },
] as const;

/** Phone tab bar; the current tab gets a tinted pill. The last item opens "suggest an improvement". */
export function BottomNav() {
  const t = useTranslations("nav");
  const sg = useTranslations("suggestion");
  const section = sectionOf(usePathname());
  return (
    <nav
      aria-label={t("bottom")}
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-rule bg-white pb-[max(6px,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="grid grid-cols-5 pt-1.5">
        {items.map((i) => {
          const current = section === i.href;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={current ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-1 text-xs ${current ? "font-semibold text-sign" : "font-medium text-muted-foreground"}`}
              >
                <span className={`flex rounded-[14px] px-4 py-1 ${current ? "bg-sign-tint" : ""}`}>
                  <i.Icon strokeWidth={1.9} className="size-5.5" />
                </span>
                {t(i.key)}
              </Link>
            </li>
          );
        })}
        <li>
          <SuggestionDialog
            trigger={{
              "aria-label": sg("button"),
              className: "group flex w-full flex-col items-center gap-0.5 py-1 text-xs font-semibold text-ink",
              children: (
                <>
                  {/* Yellow like the floating button on bigger screens, so it stands apart from the tabs */}
                  <span className="flex rounded-[14px] bg-yellow px-4 py-1 shadow-sm ring-1 ring-ink/10 group-active:bg-[#e5b40f]">
                    <LightbulbIcon strokeWidth={2} className="size-5.5" />
                  </span>
                  {t("suggest")}
                </>
              ),
            }}
          />
        </li>
      </ul>
    </nav>
  );
}
