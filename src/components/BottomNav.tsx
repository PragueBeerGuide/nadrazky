"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { sectionOf } from "./section";

const items = [
  { href: "/", key: "home", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/map", key: "map", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14" },
  { href: "/pubs", key: "pubs", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/lines", key: "lines", icon: "M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" },
] as const;

/** Phone tab bar; the current tab gets a tinted pill. */
export function BottomNav() {
  const t = useTranslations("nav");
  const section = sectionOf(usePathname());
  return (
    <nav
      aria-label={t("bottom")}
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-rule bg-white pb-[max(6px,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="grid grid-cols-4 pt-1.5">
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
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={i.icon} />
                  </svg>
                </span>
                {t(i.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
