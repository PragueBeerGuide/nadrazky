"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DAILY_REPORT_LIMIT, MESSAGE_MAX, needsMessage, needsValue, VALUE_MAX, type ReportKind } from "@/lib/report";
import { submitReport, type ReportState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  slug: string;
  name: string;
  kinds: ReportKind[];
  /** What the pub page shows now, for the kinds that propose a new value. */
  current: { name: string; hours: string | null; address: string | null; beers: string | null };
};

/** "Report something else" starts the form over. */
export function ReportForm(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <Form key={attempt} {...props} onAnother={() => setAttempt((a) => a + 1)} />;
}

function Form({ slug, name, kinds, current, onAnother }: Props & { onAnother: () => void }) {
  const t = useTranslations("report");
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [messageLength, setMessageLength] = useState(0);
  // After a refused submit React resets the form to the values sent back; follow them.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setKind((state.values?.kind as ReportKind) || null);
    setMessageLength(state.values?.message.length ?? 0);
  }

  if (state.done) {
    return (
      <Card render={<section />} role="status" className="flex flex-col items-start gap-3 p-5 md:p-7">
        <h2 className="text-[28px]">{t("doneTitle")}</h2>
        <p>{state.autoApproved ? t("doneTextApproved", { name }) : t("doneText", { name })}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/pub/[slug]", params: { slug } }} className={buttonVariants({ size: "xl" })}>
            {t("back")}
          </Link>
          <Button variant="outline" size="xl" onClick={onAnother}>
            {t("another")}
          </Button>
        </div>
      </Card>
    );
  }

  const valueKind = kind && needsValue(kind) ? (kind as "name" | "hours" | "address" | "beers") : null;
  const currentValue = valueKind ? current[valueKind] : null;

  return (
    <Card render={<form action={action} noValidate />} className="flex flex-col gap-6 p-5 md:p-7">
      <input type="hidden" name="slug" value={slug} />

      <fieldset className="flex flex-col" aria-describedby={state.fields?.kind ? "kind-error" : undefined}>
        <legend className="mb-3 font-display text-[22px] font-bold">{t("kindTitle")}</legend>
        {/* Controlled, so the choice survives the form reset after a rejected submit */}
        <RadioGroup name="kind" value={kind} onValueChange={(v) => setKind(v as ReportKind)} className="gap-2">
          {kinds.map((k) => (
            <Label
              key={k}
              className="min-h-12 cursor-pointer gap-3 rounded-xl border border-field bg-white px-3.5 py-2.5 text-base leading-normal has-focus-visible:outline-3 has-focus-visible:outline-yellow has-data-checked:border-sign has-data-checked:bg-sign-tint has-data-checked:text-sign"
            >
              <RadioGroupItem value={k} className="size-5" />
              {t(`kinds.${k}`)}
            </Label>
          ))}
        </RadioGroup>
        {state.fields?.kind && (
          <p id="kind-error" className="mt-2 text-sm font-medium text-closed-ink">
            {t("errors.kind")}
          </p>
        )}
      </fieldset>

      {valueKind && (
        <div className="flex flex-col gap-2">
          <label htmlFor="value" className="font-display text-[22px] font-bold">
            {t(`valueLabels.${valueKind}`)}
          </label>
          {currentValue && <p className="text-sm text-muted-foreground">{t("current", { value: currentValue })}</p>}
          <Input
            id="value"
            name="value"
            required
            maxLength={VALUE_MAX}
            defaultValue={state.values?.kind === valueKind ? state.values.value : ""}
            placeholder={t(`valuePlaceholders.${valueKind}`)}
            aria-invalid={state.fields?.value ? true : undefined}
            aria-describedby={state.fields?.value ? "value-error" : undefined}
            className="h-12"
          />
          {state.fields?.value && (
            <p id="value-error" className="text-sm font-medium text-closed-ink">
              {t("errors.value")}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="message" className="flex items-baseline gap-2 font-display text-[22px] font-bold">
            {t("messageLabel")}
            {!(kind && needsMessage(kind)) && <span className="label">{t("optional")}</span>}
          </label>
          <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
            {messageLength}/{MESSAGE_MAX}
          </span>
        </div>
        <Textarea
          id="message"
          name="message"
          rows={4}
          maxLength={MESSAGE_MAX}
          defaultValue={state.values?.message}
          placeholder={t("messagePlaceholder")}
          onChange={(e) => setMessageLength(e.target.value.length)}
          aria-invalid={state.fields?.message ? true : undefined}
          aria-describedby={state.fields?.message ? "message-error" : undefined}
          className="min-h-24 resize-y"
        />
        {state.fields?.message && (
          <p id="message-error" className="text-sm font-medium text-closed-ink">
            {t("errors.message")}
          </p>
        )}
      </div>

      {state.error && (
        <Alert variant="error" className="rounded-xl">
          {state.error === "signIn" || state.error === "finishSignUp" ? (
            <Link href="/login" className="underline underline-offset-2">
              {t(`errors.${state.error}`)}
            </Link>
          ) : (
            <p>{t(`errors.${state.error}`, { max: DAILY_REPORT_LIMIT })}</p>
          )}
        </Alert>
      )}

      <Button variant="yellow" size="xl" type="submit" disabled={pending} className="h-14 rounded-xl text-lg">
        {pending ? t("sending") : t("submit")}
      </Button>
      <Link href={{ pathname: "/pub/[slug]", params: { slug } }} className="link -mt-2 self-center text-[15px]">
        {t("back")}
      </Link>
    </Card>
  );
}
