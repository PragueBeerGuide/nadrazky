"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { deletePubAction } from "@/app/[locale]/pub/[slug]/actions";

type Props = {
  id: number;
  name: string;
  /** In a list of pubs: an icon button, and the list stays open (it updates without the pub). */
  compact?: boolean;
};

/** For moderators and admins: deletes a pub after a confirmation; on its own page, then goes to the pub list. */
export function DeletePubButton({ id, name, compact = false }: Props) {
  const t = useTranslations("pub.delete");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      await deletePubAction(formData);
      setOpen(false);
      toast.add({ title: t("done", { name }), type: "success" });
      if (!compact) router.replace("/pubs");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {compact ? (
        <AlertDialogTrigger render={<Button variant="destructive" size="icon" aria-label={t("label", { name })} className="size-10" />}>
          <Trash2Icon />
        </AlertDialogTrigger>
      ) : (
        <AlertDialogTrigger render={<Button variant="destructive" size="md" className="h-11" />}>
          <Trash2Icon />
          {t("button")}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("text")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm} disabled={pending}>
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
