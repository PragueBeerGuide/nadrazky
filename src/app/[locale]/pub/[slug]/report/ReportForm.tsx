"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DAILY_REPORT_LIMIT, MESSAGE_MAX, needsMessage, needsValue, VALUE_MAX, type ReportKind } from "@/lib/report";
import { submitReport, type ReportState } from "./actions";

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
      <section role="status" className="card flex flex-col items-start gap-3 p-5 md:p-7">
        <h2 className="text-[28px]">{t("doneTitle")}</h2>
        <p>{state.autoApproved ? t("doneTextApproved", { name }) : t("doneText", { name })}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/pub/[slug]", params: { slug } }} className="btn btn-sign">
            {t("back")}
          </Link>
          <button type="button" onClick={onAnother} className="btn btn-outline">
            {t("another")}
          </button>
        </div>
      </section>
    );
  }

  const valueKind = kind && needsValue(kind) ? (kind as "name" | "hours" | "address" | "beers") : null;
  const currentValue = valueKind ? current[valueKind] : null;

  return (
    <form
      action={action}
      className="card flex flex-col gap-6 p-5 md:p-7"
      noValidate
    >
      <input type="hidden" name="slug" value={slug} />

      <fieldset className="flex flex-col" aria-describedby={state.fields?.kind ? "kind-error" : undefined}>
        <legend className="mb-3 font-display text-[22px] font-bold">{t("kindTitle")}</legend>
        <div className="flex flex-col gap-2">
          {kinds.map((k) => (
            <label
              key={k}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-field bg-white px-3.5 py-2.5 font-medium has-checked:border-sign has-checked:bg-sign-tint has-checked:text-sign has-focus-visible:outline-3 has-focus-visible:outline-yellow"
            >
              <input
                type="radio"
                name="kind"
                value={k}
                defaultChecked={state.values?.kind === k}
                onChange={() => setKind(k)}
                className="size-5 shrink-0 accent-sign"
              />
              {t(`kinds.${k}`)}
            </label>
          ))}
        </div>
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
          {currentValue && <p className="text-sm text-muted">{t("current", { value: currentValue })}</p>}
          <input
            id="value"
            name="value"
            required
            maxLength={VALUE_MAX}
            defaultValue={state.values?.kind === valueKind ? state.values.value : ""}
            placeholder={t(`valuePlaceholders.${valueKind}`)}
            aria-invalid={state.fields?.value ? true : undefined}
            aria-describedby={state.fields?.value ? "value-error" : undefined}
            className="field h-12"
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
          <span className="font-mono text-xs text-muted" aria-hidden="true">
            {messageLength}/{MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={MESSAGE_MAX}
          defaultValue={state.values?.message}
          placeholder={t("messagePlaceholder")}
          onChange={(e) => setMessageLength(e.target.value.length)}
          aria-invalid={state.fields?.message ? true : undefined}
          aria-describedby={state.fields?.message ? "message-error" : undefined}
          className="field h-auto resize-y py-2.5"
        />
        {state.fields?.message && (
          <p id="message-error" className="text-sm font-medium text-closed-ink">
            {t("errors.message")}
          </p>
        )}
      </div>

      {state.error && (
        <div role="alert" className="rounded-xl bg-closed-bg px-4 py-3 text-[15px] font-medium text-closed-ink">
          {state.error === "signIn" || state.error === "finishSignUp" ? (
            <Link href="/login" className="underline underline-offset-2">
              {t(`errors.${state.error}`)}
            </Link>
          ) : (
            <p>{t(`errors.${state.error}`, { max: DAILY_REPORT_LIMIT })}</p>
          )}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-yellow h-14 rounded-xl text-lg">
        {pending ? t("sending") : t("submit")}
      </button>
      <Link href={{ pathname: "/pub/[slug]", params: { slug } }} className="link -mt-2 self-center text-[15px]">
        {t("back")}
      </Link>
    </form>
  );
}
