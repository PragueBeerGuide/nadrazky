"use client";

import { useState, useTransition } from "react";
import { BellIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { readNotifications } from "@/app/[locale]/notifications/actions";
import { Link } from "@/i18n/navigation";
import { excerpt, notificationHref, type NotificationKind } from "@/lib/notification";
import type { ReportKind } from "@/lib/report";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: number;
  kind: NotificationKind;
  read: boolean;
  /** When it came, formatted on the server. */
  when: string;
  actor: string | null;
  suggestion: string | null;
  reportKind: ReportKind | null;
  pub: string | null;
};

/** The bell in the header: how many notifications are unread, and a popover listing the newest. */
export function NotificationBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const t = useTranslations("notifications");
  const rt = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function read(id?: number) {
    startTransition(() => readNotifications(id));
  }

  function text(n: NotificationItem) {
    const username = n.actor ?? "?";
    switch (n.kind) {
      case "friend_request":
        return t("friendRequest", { username });
      case "suggestion": {
        const quote = excerpt(n.suggestion ?? "");
        return n.actor ? t("suggestion", { username, text: quote }) : t("suggestionAnonymous", { text: quote });
      }
      case "report":
        return t("report", { username, pub: n.pub ?? "?", kind: n.reportKind ? rt(`kinds.${n.reportKind}`) : "?" });
    }
  }

  const label = unread > 0 ? `${t("bell")}: ${t("unread", { count: unread })}` : t("bell");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        title={label}
        className="relative flex size-11 items-center justify-center rounded-lg hover:bg-sign-deep data-popup-open:bg-sign-deep"
      >
        <BellIcon className="size-5.5" strokeWidth={1.9} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-yellow px-1 font-mono text-[11px] leading-none font-semibold text-ink"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[1100] w-[min(22rem,calc(100vw-2rem))] gap-1 rounded-xl p-2 shadow-[0_16px_40px_rgb(14_26_43/0.28)]"
      >
        <PopoverHeader className="flex-row items-center justify-between gap-2 px-3 pt-1.5 pb-2">
          <PopoverTitle className="font-display text-[22px] font-bold">{t("title")}</PopoverTitle>
          {unread > 0 && (
            <Button variant="link" className="h-auto px-0 text-sm" onClick={() => read()}>
              {t("markAll")}
            </Button>
          )}
        </PopoverHeader>
        {items.length === 0 ? (
          <p className="px-3 pb-3 text-[15px] text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul aria-label={t("title")} className="flex max-h-[min(26rem,60vh)] flex-col overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={notificationHref(n.kind)}
                  onClick={() => {
                    setOpen(false);
                    if (!n.read) read(n.id);
                  }}
                  className={cn("flex gap-3 rounded-lg px-3 py-2.5 hover:bg-platform", !n.read && "bg-sign-tint/60")}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-yellow")} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn("text-[15px] leading-snug break-words", !n.read && "font-semibold")}>
                      {!n.read && <span className="sr-only">{t("new")}: </span>}
                      {text(n)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{n.when}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
