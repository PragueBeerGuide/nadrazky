"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { USERNAME_MAX } from "@/lib/auth/signup";
import { finishSignUp, type FinishState } from "./actions";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

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
        <InputGroup className="h-12 rounded-md bg-card">
          <InputGroupAddon className="pl-3.5 font-mono text-base font-normal" aria-hidden="true">
            @
          </InputGroupAddon>
          <InputGroupInput
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
            className="h-12 pr-3.5 pl-1 font-mono"
          />
        </InputGroup>
        <p id="username-hint" className={`text-sm ${usernameError ? "font-medium text-closed-ink" : "text-muted-foreground"}`}>
          {usernameError ?? t("usernameHint")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="language" className="label">
          {t("language")}
        </label>
        <NativeSelect id="language" name="language" defaultValue={state.values?.language ?? language} className="w-full [&_select]:h-12">
          {routing.locales.map((l) => (
            <NativeSelectOption key={l} value={l}>
              {nav(l)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="cursor-pointer items-start gap-3 rounded-xl border border-field bg-platform p-4 text-base leading-normal">
          <Checkbox
            name="adult"
            required
            aria-invalid={state.errors?.adult ? true : undefined}
            aria-describedby={state.errors?.adult ? "adult-error" : undefined}
            className="mt-0.5 size-5"
          />
          {t("adultConfirm")}
        </Label>
        {state.errors?.adult && (
          <p id="adult-error" className="text-sm font-medium text-closed-ink">
            {t("adultRequired")}
          </p>
        )}
      </div>

      <Button variant="yellow" size="xl" type="submit" disabled={pending} className="h-14 rounded-xl text-[17px]">
        {pending ? t("saving") : t("finish")}
      </Button>
    </form>
  );
}
