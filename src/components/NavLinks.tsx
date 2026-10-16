"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { sectionOf } from "./section";

const links = ["/map", "/pubs", "/regions", "/lines"] as const;
const labels = { "/map": "map", "/pubs": "pubs", "/regions": "regions", "/lines": "lines" } as const;

/** Header navigation; the current section gets a timetable-yellow underline. */
export function NavLinks() {
  const t = useTranslations("nav");
  const section = sectionOf(usePathname());
  return (
    <nav aria-label={t("main")} className="hidden flex-wrap gap-1 md:flex">
      {links.map((href) => {
        const current = section === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`px-3 py-2.5 text-[15px] ${
              current
                ? "font-semibold text-white shadow-[inset_0_-3px_0_var(--yellow)]"
                : "font-medium text-sign-mist hover:text-white"
            }`}
          >
            {t(labels[href])}
          </Link>
        );
      })}
    </nav>
  );
}
