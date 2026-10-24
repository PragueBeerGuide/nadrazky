import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { authEnabled } from "@/lib/auth/config";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const t = await getTranslations("auth");
  const user = await getCurrentUser();
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
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {user ? (
            <UserMenu
              user={{ name: user.name, username: user.username, email: user.email, role: user.role }}
              finished={signUpFinished(user)}
            />
          ) : (
            authEnabled() && (
              <Link href="/login" className="btn btn-ghost-dark min-h-11 px-3 text-[15px] md:px-4">
                {t("logIn")}
              </Link>
            )
          )}
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
