"use client";

import { type ComponentProps, useActionState, useState } from "react";
import { LightbulbIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { submitSuggestion, type SuggestionState } from "@/app/[locale]/suggestions/actions";
import { SUGGESTION_MAX, SUGGESTION_MIN } from "@/lib/suggestion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type DialogTriggerProps = ComponentProps<typeof DialogTrigger>;

/** The floating "suggest an improvement" button in the bottom-right corner; on phones it lives in the tab bar (BottomNav) instead. */
export function SuggestionButton() {
  const t = useTranslations("suggestion");
  return (
    <SuggestionDialog
      trigger={{
        render: <Button variant="yellow" size="icon" />,
        "aria-label": t("button"),
        title: t("button"),
        className: "fixed right-6 bottom-(--fab-bottom) z-[1000] size-14 rounded-full shadow-lg ring-1 ring-ink/10 max-md:hidden",
        children: <LightbulbIcon strokeWidth={2} className="size-6" />,
      }}
    />
  );
}

/** The "suggest an improvement" form in a dialog, opened by `trigger`. */
export function SuggestionDialog({ trigger }: { trigger: DialogTriggerProps }) {
  const [open, setOpen] = useState(false);
  // A new key each time the dialog opens, so a sent form starts over.
  const [attempt, setAttempt] = useState(0);

  function change(next: boolean) {
    setOpen(next);
    if (next) setAttempt((a) => a + 1);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger {...trigger} />
      <DialogContent className="gap-5 p-5 sm:max-w-md md:p-6">
        <SuggestionForm key={attempt} />
      </DialogContent>
    </Dialog>
  );
}

function SuggestionForm() {
  const t = useTranslations("suggestion");
  const page = usePathname();
  const [state, action, pending] = useActionState<SuggestionState, FormData>(submitSuggestion, {});
  const [length, setLength] = useState(0);
  // After a refused submit React resets the form to the text sent back; follow it.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setLength(state.message?.length ?? 0);
  }

  if (state.done) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-[28px] leading-none font-bold">{t("doneTitle")}</DialogTitle>
          <DialogDescription className="text-[15px]">{t("doneText")}</DialogDescription>
        </DialogHeader>
        <DialogClose render={<Button variant="yellow" size="xl" className="self-end" />}>{t("close")}</DialogClose>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <DialogHeader className="pr-8">
        <DialogTitle className="text-[28px] leading-none font-bold">{t("title")}</DialogTitle>
        <DialogDescription className="text-[15px]">{t("intro")}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="page" value={page} />
      {/* Honeypot for bots; hidden from people and assistive tech. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="suggestion-message" className="font-display text-[20px] font-bold">
            {t("label")}
          </label>
          <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
            {length}/{SUGGESTION_MAX}
          </span>
        </div>
        <Textarea
          id="suggestion-message"
          name="message"
          rows={5}
          required
          minLength={SUGGESTION_MIN}
          maxLength={SUGGESTION_MAX}
          defaultValue={state.message}
          placeholder={t("placeholder")}
          onChange={(e) => setLength(e.target.value.length)}
          aria-invalid={state.error === "message" ? true : undefined}
          aria-describedby={state.error === "message" ? "suggestion-error" : undefined}
          className="min-h-32 resize-y"
        />
        {state.error === "message" && (
          <p id="suggestion-error" className="text-sm font-medium text-closed-ink">
            {t("errors.message", { min: SUGGESTION_MIN })}
          </p>
        )}
      </div>

      {state.error === "limit" && (
        <Alert variant="error" className="rounded-xl">
          <p>{t("errors.limit")}</p>
        </Alert>
      )}

      <Button variant="yellow" size="xl" type="submit" disabled={pending} className="h-12 rounded-xl">
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
