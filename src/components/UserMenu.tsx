"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logOut } from "@/app/[locale]/login/actions";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  user: { name: string | null; username: string | null; email: string | null; role: "user" | "moderator" | "admin"; avatarUrl: string | null };
  finished: boolean;
  /** Reports waiting for review; set only for moderators and admins. */
  waiting: number | null;
  /** Friend requests waiting for the user's answer. */
  requests: number;
};

const item = "min-h-11 px-3 text-[15px] font-medium";

/** The signed-in user in the header: their picture, which opens a menu with the profile and log out. */
export function UserMenu({ user, finished, waiting, requests }: Props) {
  const t = useTranslations("auth");
  const pt = useTranslations("profile");
  const mt = useTranslations("moderation");
  const ft = useTranslations("friends");
  const locale = useLocale();
  const logOutForm = useRef<HTMLFormElement>(null);
  const label = user.username ? `@${user.username}` : (user.name ?? user.email ?? "");
  const initial = (user.username ?? user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${t("account")}: ${label}`}
          className="flex h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-sign-deep data-popup-open:bg-sign-deep md:pr-3"
        >
          <Avatar url={user.avatarUrl} name={initial} size={32} />
          <span className="hidden max-w-[16ch] truncate text-[15px] font-semibold md:inline">{label}</span>
          {/* Sign-up to finish (on phones, where the name is hidden) or friend requests to answer */}
          {(!finished || requests > 0) && (
            <span className={`size-2 rounded-full bg-yellow ${requests > 0 ? "" : "md:hidden"}`} aria-hidden="true" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="z-[1100] w-64 rounded-xl p-2 shadow-[0_16px_40px_rgb(14_26_43/0.28)]">
          <div className="flex min-w-0 flex-col px-3 pt-2 pb-3">
            <span className="truncate font-semibold">{label}</span>
            {user.email && <span className="truncate text-sm text-muted-foreground">{user.email}</span>}
            {user.role !== "user" && <span className="label mt-1">{t(`roles.${user.role}`)}</span>}
          </div>
          {finished ? (
            <>
              <DropdownMenuLinkItem render={<Link href="/profile" />} className={item}>
                {pt("menuLink")}
              </DropdownMenuLinkItem>
              <DropdownMenuLinkItem render={<Link href="/friends" />} className={`${item} justify-between`}>
                {ft("menuLink")}
                {requests > 0 && <Badge className="bg-yellow font-mono font-semibold text-ink">{ft("menuCount", { count: requests })}</Badge>}
              </DropdownMenuLinkItem>
            </>
          ) : (
            <DropdownMenuLinkItem render={<Link href="/login" />} className={`${item} font-semibold`}>
              <span className="size-2 rounded-full bg-yellow" aria-hidden="true" />
              {t("finishLink")}
            </DropdownMenuLinkItem>
          )}
          {waiting !== null && (
            <DropdownMenuLinkItem render={<Link href="/moderation" />} className={`${item} justify-between`}>
              {mt("menuLink")}
              {waiting > 0 && <Badge className="bg-yellow font-mono font-semibold text-ink">{mt("menuCount", { count: waiting })}</Badge>}
            </DropdownMenuLinkItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logOutForm.current?.requestSubmit()} className={item}>
            {t("logOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which unmounts as it closes */}
      <form ref={logOutForm} action={logOut} hidden>
        <input type="hidden" name="locale" value={locale} />
      </form>
    </>
  );
}
