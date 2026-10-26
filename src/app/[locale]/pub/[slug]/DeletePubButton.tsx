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
import { deletePubAction } from "./actions";

/** For moderators and admins on a pub page: deletes the pub after a confirmation, then goes to the pub list. */
export function DeletePubButton({ id, name }: { id: number; name: string }) {
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
      router.replace("/pubs");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="md" className="h-11" />}>
        <Trash2Icon />
        {t("button")}
      </AlertDialogTrigger>
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
