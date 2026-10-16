import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="bg-sign text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-7 px-4 md:h-[74px] md:px-6">
        <Link
          href="/"
          className="inline-flex rounded-[6px] bg-white p-[3px] text-sign"
        >
          <span className="rounded-[4px] border-2 border-sign px-2.5 font-display text-[22px] leading-[30px] font-bold md:px-3 md:text-[26px] md:leading-9">
            Nádražky
          </span>
        </Link>
        <NavLinks />
        <div className="ml-auto">
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
