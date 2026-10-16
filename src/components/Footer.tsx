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
  ] as const;
  return (
    <footer className="bg-ink text-sm text-board-text">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-6 px-4 py-10 md:px-6">
        <div className="flex max-w-xl flex-col gap-2.5">
          <span className="font-display text-[26px] leading-none font-bold text-white">Nádražky</span>
          <span>{t("data")}</span>
          <a href="https://pragueguide.beer" className="self-start text-sign-mist underline-offset-2 hover:underline">
            {t("by")}
          </a>
        </div>
        <nav aria-label={nav("footer")} className="flex flex-wrap content-start gap-x-5 gap-y-1">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="py-1.5 text-sign-mist hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
