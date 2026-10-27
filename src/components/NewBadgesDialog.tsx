"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { badgesSeen } from "@/app/[locale]/badges/actions";
import { Link } from "@/i18n/navigation";
import type { badgeHref } from "@/lib/badgeLinks";
import { BadgeMedal } from "./BadgeMedal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type NewBadgeItem = {
  key: string;
  ids: number[];
  heading: string;
  state: string;
  href: ReturnType<typeof badgeHref>;
  medal: React.ComponentProps<typeof BadgeMedal>;
};

/** "New badge": the levels a check-in just reached. Closing it marks them seen. */
export function NewBadgesDialog({ items }: { items: NewBadgeItem[] }) {
  const t = useTranslations("badges.popup");
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();

  function change(next: boolean) {
    setOpen(next);
    if (!next) startTransition(() => badgesSeen(items.flatMap((i) => i.ids)));
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="gap-5 p-5 sm:max-w-md md:p-6">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-[32px] leading-none font-bold">{t("title", { count: items.length })}</DialogTitle>
          <DialogDescription className="text-[15px]">{t("text")}</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {items.map((i) => (
            <li key={i.key}>
              <Link href={i.href} onClick={() => change(false)} className="flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-platform">
                <BadgeMedal {...i.medal} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-2xl leading-tight font-bold">{i.heading}</span>
                  <span className="font-mono text-sm font-semibold text-sign">{i.state}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0 sm:justify-center">
          <Link href="/badges" onClick={() => change(false)} className={buttonVariants({ variant: "outline", size: "xl" })}>
            {t("seeAll")}
          </Link>
          <Button variant="yellow" size="xl" onClick={() => change(false)}>
            {t("ok")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
