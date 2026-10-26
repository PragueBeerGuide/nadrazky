"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logOut } from "@/app/[locale]/login/actions";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string | null; username: string | null; email: string | null; role: "user" | "moderator" | "admin"; avatarUrl: string | null };
  finished: boolean;
  /** Reports waiting for review; set only for moderators and admins. */
  waiting: number | null;
};

const item = cn(buttonVariants({ variant: "ghost" }), "h-11 w-full justify-start px-3 text-[15px] font-medium");

/** The signed-in user in the header: their picture, which opens a popover with the profile and log out. */
export function UserMenu({ user, finished, waiting }: Props) {
  const t = useTranslations("auth");
  const pt = useTranslations("profile");
  const mt = useTranslations("moderation");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const label = user.username ? `@${user.username}` : (user.name ?? user.email ?? "");
  const initial = (user.username ?? user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${t("account")}: ${label}`}
        className="flex h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-sign-deep data-popup-open:bg-sign-deep md:pr-3"
      >
        <Avatar url={user.avatarUrl} name={initial} size={32} />
        <span className="hidden max-w-[16ch] truncate text-[15px] font-semibold md:inline">{label}</span>
        {!finished && <span className="size-2 rounded-full bg-yellow md:hidden" aria-hidden="true" />}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="z-[1100] w-64 gap-1 rounded-xl p-2 shadow-[0_16px_40px_rgb(14_26_43/0.28)]">
        <PopoverHeader className="min-w-0 px-3 pt-2 pb-3">
          <PopoverTitle className="truncate font-sans font-semibold">{label}</PopoverTitle>
          {user.email && <PopoverDescription className="truncate">{user.email}</PopoverDescription>}
          {user.role !== "user" && <span className="label mt-1">{t(`roles.${user.role}`)}</span>}
        </PopoverHeader>
        <nav className="flex flex-col">
          {finished ? (
            <Link href="/profile" onClick={close} className={item}>
              {pt("menuLink")}
            </Link>
          ) : (
            <Link href="/login" onClick={close} className={cn(item, "font-semibold")}>
              <span className="size-2 rounded-full bg-yellow" aria-hidden="true" />
              {t("finishLink")}
            </Link>
          )}
          {waiting !== null && (
            <Link href="/moderation" onClick={close} className={cn(item, "justify-between")}>
              {mt("menuLink")}
              {waiting > 0 && <Badge className="bg-yellow font-mono font-semibold text-ink">{mt("menuCount", { count: waiting })}</Badge>}
            </Link>
          )}
        </nav>
        <Separator className="my-1" />
        <form action={logOut}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="ghost" className={item}>
            {t("logOut")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
