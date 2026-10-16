import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./LanguageSwitch";

export async function Header() {
  const t = await getTranslations("nav");
  const links = [
    { href: "/map", label: t("map") },
    { href: "/pubs", label: t("pubs") },
    { href: "/regions", label: t("regions") },
    { href: "/lines", label: t("lines") },
  ] as const;
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/pbg-mascot.png" alt="" width={36} height={36} className="rounded-full bg-card" />
          <span className="font-display text-2xl font-semibold tracking-tight">Nádražky</span>
        </Link>
        <nav className="ml-4 hidden gap-5 text-sm font-medium md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-primary-mist hover:text-primary-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <LanguageSwitch label={t("language")} ariaLabel={t("languageLabel")} />
        </div>
      </div>
    </header>
  );
}
