import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { authEnabled } from "@/lib/auth/config";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { canModerate } from "@/lib/auth/roles";
import { avatarUrl } from "@/lib/profile";
import { countOpenReports } from "@/lib/reports";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function Header() {
  const t = await getTranslations("auth");
  const user = await getCurrentUser();
  // Moderators and admins see how many reports are waiting.
  const waiting = user && canModerate(user.role) ? await countOpenReports() : null;
  return (
    <header className="bg-sign text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-[74px] md:gap-7 md:px-6">
        <Link
          href="/"
          className="inline-flex shrink-0 rounded-[6px] bg-white p-[3px] text-sign"
        >
          <span className="rounded-[4px] border-2 border-sign px-2.5 font-display text-[22px] leading-[30px] font-bold md:px-3 md:text-[26px] md:leading-9">
            Nádražky
          </span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          {user ? (
            <UserMenu
              user={{ name: user.name, username: user.username, email: user.email, role: user.role, avatarUrl: avatarUrl(user.id, user.avatarUpdatedAt) }}
              finished={signUpFinished(user)}
              waiting={waiting}
            />
          ) : (
            authEnabled() && (
              // On the narrowest phones only the icon shows, so the header fits in 320 px.
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost-dark", size: "xl" }), "h-11 gap-2 px-3 text-[15px] md:px-4")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <span className="max-[359px]:sr-only">{t("logIn")}</span>
              </Link>
            )
          )}
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
