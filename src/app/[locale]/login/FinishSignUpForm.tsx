"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { USERNAME_MAX } from "@/lib/auth/signup";
import { finishSignUp, type FinishState } from "./actions";

type Props = { locale: string; next: string; username: string; language: string };

/** Second step of sign-up: a username and the 18+ confirmation. */
export function FinishSignUpForm({ locale, next, username, language }: Props) {
  const t = useTranslations("auth");
  const nav = useTranslations("nav");
  const [state, action, pending] = useActionState<FinishState, FormData>(finishSignUp, {});
  const usernameError = state.errors?.username === "taken" ? t("usernameTaken") : state.errors?.username ? t("usernameInvalid") : null;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="label">
          {t("username")}
        </label>
        <div className="flex items-center rounded-lg border border-field bg-white focus-within:outline-3 focus-within:outline-sign">
          <span className="pl-3.5 font-mono text-muted" aria-hidden="true">
            @
          </span>
          <input
            id="username"
            name="username"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            defaultValue={state.values?.username ?? username}
            aria-invalid={usernameError ? true : undefined}
            aria-describedby="username-hint"
            className="h-12 min-w-0 flex-1 rounded-lg bg-transparent pr-3.5 pl-1 font-mono focus:outline-none"
          />
        </div>
        <p id="username-hint" className={`text-sm ${usernameError ? "font-medium text-closed-ink" : "text-muted"}`}>
          {usernameError ?? t("usernameHint")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="language" className="label">
          {t("language")}
        </label>
        <select id="language" name="language" defaultValue={state.values?.language ?? language} className="field h-12">
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {nav(l)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-field bg-platform p-4">
          <input
            type="checkbox"
            name="adult"
            required
            aria-invalid={state.errors?.adult ? true : undefined}
            aria-describedby={state.errors?.adult ? "adult-error" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-sign"
          />
          <span className="font-medium">{t("adultConfirm")}</span>
        </label>
        {state.errors?.adult && (
          <p id="adult-error" className="text-sm font-medium text-closed-ink">
            {t("adultRequired")}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className="btn btn-yellow h-14 rounded-xl text-[17px]">
        {pending ? t("saving") : t("finish")}
      </button>
    </form>
  );
}
