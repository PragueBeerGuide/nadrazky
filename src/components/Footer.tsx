import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const links = [
    ["/map", nav("map")],
    ["/pubs", nav("pubs")],
    ["/regions", nav("regions")],
    ["/lines", nav("lines")],
    ["/about", nav("about")],
    ["/privacy", nav("privacy")],
  ] as const;
  return (
    // On a phone the fixed bottom tab bar (BottomNav) would cover the footer's last row.
    <footer className="bg-ink pb-[calc(68px+env(safe-area-inset-bottom))] text-sm text-board-text md:pb-0">
      <div className="page-column flex flex-wrap justify-between gap-6 py-8 md:py-10">
        <div className="flex max-w-xl flex-col gap-2.5">
          <span className="font-display text-[26px] leading-none font-bold text-white">Nádražky</span>
          <span>{t("data")}</span>
          <a href="https://pragueguide.beer" className="self-start text-sign-mist underline-offset-2 hover:underline">
            {t("by")}
          </a>
        </div>
        <nav aria-label={nav("footer")} className="-mx-2 flex flex-wrap content-start md:mx-0 md:gap-x-3">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="px-2 py-2.5 text-sign-mist hover:text-white md:py-1.5">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
