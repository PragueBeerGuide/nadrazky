"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Relation } from "@/lib/friend";
import { friendAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  username: string;
  relation: Relation;
  /** In the friends list a friend can be removed; elsewhere they only show as a friend. */
  removable?: boolean;
};

/** The buttons next to another user: add, cancel, accept or decline, or remove a friend. */
export function FriendActions({ userId, username, relation, removable = false }: Props) {
  const t = useTranslations("friends");

  // A sent request is confirmed with a toast; the row then shows it as pending.
  async function act(formData: FormData) {
    const { sent } = await friendAction(formData);
    if (sent) toast.success(t("toasts.send", { username }));
  }

  return (
    <form action={act} className="flex shrink-0 flex-wrap items-center gap-2">
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
          <Badge variant="unknown">{t("pending")}</Badge>
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
