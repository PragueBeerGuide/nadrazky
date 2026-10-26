"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { Relation } from "@/lib/friend";
import { friendAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  relation: Relation;
  /** In the friends list a friend can be removed; elsewhere they only show as a friend. */
  removable?: boolean;
};

/** The buttons next to another user: add, cancel, accept or decline, or remove a friend. */
export function FriendActions({ userId, relation, removable = false }: Props) {
  return (
    <form action={friendAction} className="flex shrink-0 flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Buttons relation={relation} removable={removable} />
    </form>
  );
}

function Buttons({ relation, removable }: { relation: Relation; removable: boolean }) {
  const t = useTranslations("friends");
  const { pending } = useFormStatus();
  const button = (action: string, label: string, variant: "default" | "outline" = "outline") => (
    <Button type="submit" name="action" value={action} variant={variant} size="md" disabled={pending} className="h-11">
      {label}
    </Button>
  );

  switch (relation) {
    case "none":
      return button("send", t("add"), "default");
    case "sent":
      return (
        <>
          <span className="text-sm text-muted-foreground">{t("sent")}</span>
          {button("cancel", t("cancel"))}
        </>
      );
    case "received":
      return (
        <>
          {button("decline", t("decline"))}
          {button("accept", t("accept"), "default")}
        </>
      );
    case "friends":
      return removable ? (
        button("remove", t("remove"))
      ) : (
        <Badge variant="open" className="h-auto">
          {t("friend")}
        </Badge>
      );
  }
}
