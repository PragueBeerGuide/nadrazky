"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signInWithEmail, type EmailState } from "./actions";

type Props = { locale: string; next: string };

/** Email link sign-in; "use another email" starts the form over. */
export function EmailSignInForm(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <EmailForm key={attempt} {...props} onRetry={() => setAttempt((a) => a + 1)} />;
}

function EmailForm({ locale, next, onRetry }: Props & { onRetry: () => void }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<EmailState, FormData>(signInWithEmail, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-xl bg-open-bg p-4 text-open-ink">
        <h2 className="text-2xl">{t("sentTitle")}</h2>
        <p className="text-[15px]">{state.email ? t("sentText", { email: state.email }) : t("sentTextNoEmail")}</p>
        <button type="button" onClick={onRetry} className="link self-start text-[15px] text-open-ink">
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  const error = state.status === "invalid" ? t("invalidEmail") : state.status === "error" ? t("errors.default") : null;
  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="label">
        {t("email")}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        placeholder={t("emailPlaceholder")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "email-error" : undefined}
        className="field h-12"
      />
      {error && (
        <p id="email-error" className="text-sm font-medium text-closed-ink">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-yellow mt-1 h-14 rounded-xl text-[17px]">
        {pending ? t("sending") : t("sendLink")}
      </button>
    </form>
  );
}
