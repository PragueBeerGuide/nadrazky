"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logOut } from "@/app/[locale]/login/actions";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string | null; username: string | null; email: string | null; role: "user" | "moderator" | "admin"; avatarUrl: string | null };
  finished: boolean;
  /** Reports waiting for review; set only for moderators and admins. */
  waiting: number | null;
};

/** The signed-in user in the header: an initial badge that opens a menu with log out. */
export function UserMenu({ user, finished, waiting }: Props) {
  const t = useTranslations("auth");
  const pt = useTranslations("profile");
  const mt = useTranslations("moderation");
  const locale = useLocale();
  const ref = useRef<HTMLDetailsElement>(null);
  const label = user.username ? `@${user.username}` : (user.name ?? user.email ?? "");
  const initial = (user.username ?? user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  // The header stays mounted across pages, so a link in the menu closes it.
  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  // Close on a click outside or Escape, like a menu.
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={`${t("account")}: ${label}`}
        className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 hover:bg-sign-deep md:pr-3 [&::-webkit-details-marker]:hidden"
      >
        <Avatar url={user.avatarUrl} name={initial} size={32} />
        <span className="hidden max-w-[16ch] truncate text-[15px] font-semibold md:inline">{label}</span>
        {!finished && <span className="size-2 rounded-full bg-yellow md:hidden" aria-hidden="true" />}
      </summary>
      <div className="absolute right-0 z-[1100] mt-2 flex w-64 flex-col gap-3 rounded-xl border border-rule bg-white p-4 text-ink shadow-[0_16px_40px_rgb(14_26_43/0.28)]">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{label}</span>
          {user.email && <span className="truncate text-sm text-muted-foreground">{user.email}</span>}
          {user.role !== "user" && <span className="label mt-1">{t(`roles.${user.role}`)}</span>}
        </div>
        {finished ? (
          <Link href="/profile" onClick={close} className={cn(buttonVariants({ size: "xl" }), "h-11")}>
            {pt("menuLink")}
          </Link>
        ) : (
          <Link href="/login" onClick={close} className={cn(buttonVariants({ variant: "yellow", size: "xl" }), "h-11")}>
            {t("finishLink")}
          </Link>
        )}
        {waiting !== null && (
          <Link href="/moderation" onClick={close} className={cn(buttonVariants({ variant: "outline", size: "xl" }), "h-11 justify-between")}>
            {mt("menuLink")}
            {waiting > 0 && <Badge className="bg-yellow font-mono font-semibold text-ink">{mt("menuCount", { count: waiting })}</Badge>}
          </Link>
        )}
        <form action={logOut}>
          <input type="hidden" name="locale" value={locale} />
          <Button variant="outline" size="xl" type="submit" className="h-11 w-full">
            {t("logOut")}
          </Button>
        </form>
      </div>
    </details>
  );
}
