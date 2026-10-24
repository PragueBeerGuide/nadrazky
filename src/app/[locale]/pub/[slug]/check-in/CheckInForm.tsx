"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AMOUNT_MAX, NOTE_MAX } from "@/lib/checkin";
import { checkIn, type CheckInState } from "./actions";

const AMOUNTS = Array.from({ length: AMOUNT_MAX }, (_, i) => i + 1);

/** One of the four "what did you have" ticks; beer and shots open a "how many?" row when ticked. */
function Had({
  name,
  label,
  amount,
  checked,
  onChange,
  missing,
}: {
  name: string;
  label: string;
  amount?: { name: string; legend: string; error: string; onChoose: () => void };
  checked: boolean;
  onChange: (checked: boolean) => void;
  missing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-field bg-white px-3.5 py-2 has-[input[type=checkbox]:checked]:border-sign has-[input[type=checkbox]:checked]:bg-sign-tint">
      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 font-medium has-checked:text-sign">
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-sign" />
        {label}
      </label>
      {amount && checked && (
        <fieldset
          onChange={amount.onChoose}
          className="flex flex-col gap-2 pb-1.5"
          aria-describedby={missing ? `${amount.name}-error` : undefined}
        >
          <legend className="mb-2 text-sm font-semibold text-ink">{amount.legend}</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {AMOUNTS.map((n) => (
              <label
                key={n}
                className="relative flex h-11 cursor-pointer items-center justify-center rounded-lg border border-field bg-white font-mono text-base font-semibold text-ink has-checked:border-ink has-checked:bg-yellow has-focus-visible:outline-3 has-focus-visible:outline-sign"
              >
                <input type="radio" name={amount.name} value={n} className="sr-only" />
                {n}
              </label>
            ))}
          </div>
          {missing && (
            <p id={`${amount.name}-error`} className="text-sm font-medium text-closed-ink">
              {amount.error}
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}

/** The check-in details; every field is optional, but beer and shots need an amount once ticked. */
export function CheckInForm({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations("checkIn");
  const [state, action, saving] = useActionState<CheckInState, FormData>(checkIn, {});
  const [noteLength, setNoteLength] = useState(0);
  const [had, setHad] = useState({ hadBeer: false, hadShot: false, hadNonAlcoholic: false, hadFood: false });
  const [missing, setMissing] = useState({ beer: false, shot: false });
  // The server's verdict wins when it reports a missing amount the browser didn't catch.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.missingAmount) setMissing({ beer: !!state.missingAmount.beer, shot: !!state.missingAmount.shot });
  }
  const errorKey = state.error;
  const tick = (key: keyof typeof had) => (checked: boolean) => {
    setHad((h) => ({ ...h, [key]: checked }));
    if (key === "hadBeer") setMissing((m) => ({ ...m, beer: false }));
    if (key === "hadShot") setMissing((m) => ({ ...m, shot: false }));
  };

  /** Asks for the missing amounts here; otherwise sends the form (without resetting it on an error). */
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gaps = { beer: had.hadBeer && !formData.get("beerCount"), shot: had.hadShot && !formData.get("shotCount") };
    setMissing(gaps);
    if (gaps.beer || gaps.shot) return;
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-6 p-5 md:p-7" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 flex items-baseline gap-2 font-display text-[22px] font-bold">
          {t("hadTitle")} <span className="label">{t("optional")}</span>
        </legend>
        <div className="flex flex-col gap-2">
          <Had
            name="hadBeer"
            label={t("beer")}
            amount={{ name: "beerCount", legend: t("howManyBeers"), error: t("amountMissing"), onChoose: () => setMissing((m) => ({ ...m, beer: false })) }}
            checked={had.hadBeer}
            onChange={tick("hadBeer")}
            missing={missing.beer}
          />
          <Had
            name="hadShot"
            label={t("shot")}
            amount={{ name: "shotCount", legend: t("howManyShots"), error: t("amountMissing"), onChoose: () => setMissing((m) => ({ ...m, shot: false })) }}
            checked={had.hadShot}
            onChange={tick("hadShot")}
            missing={missing.shot}
          />
          <Had name="hadNonAlcoholic" label={t("nonAlcoholic")} checked={had.hadNonAlcoholic} onChange={tick("hadNonAlcoholic")} />
          <Had name="hadFood" label={t("food")} checked={had.hadFood} onChange={tick("hadFood")} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col">
        <legend className="mb-3 flex items-baseline gap-2 font-display text-[22px] font-bold">
          {t("ratingTitle")} <span className="label">{t("optional")}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-field bg-white font-mono text-lg font-semibold has-checked:border-ink has-checked:bg-yellow has-focus-visible:outline-3 has-focus-visible:outline-sign"
            >
              <input type="radio" name="rating" value={n} className="sr-only" aria-label={t("ratingValue", { count: n })} />
              <span aria-hidden="true">{n}</span>
            </label>
          ))}
          <label className="relative flex h-12 cursor-pointer items-center rounded-xl border border-field bg-white px-4 text-[15px] font-medium text-muted has-checked:border-ink has-checked:text-ink has-focus-visible:outline-3 has-focus-visible:outline-sign">
            <input type="radio" name="rating" value="" defaultChecked className="sr-only" />
            {t("ratingNone")}
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="note" className="flex items-baseline gap-2 font-display text-[22px] font-bold">
            {t("noteLabel")} <span className="label">{t("optional")}</span>
          </label>
          <span className="font-mono text-xs text-muted" aria-hidden="true">
            {t("noteCount", { count: noteLength, max: NOTE_MAX })}
          </span>
        </div>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder={t("notePlaceholder")}
          onChange={(e) => setNoteLength(e.target.value.length)}
          className="field h-auto resize-y py-2.5"
        />
      </div>

      <fieldset className="flex flex-col">
        <legend className="mb-3 font-display text-[22px] font-bold">{t("openTitle")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["open", "closed"] as const).map((v) => (
            <label
              key={v}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-field bg-white px-3.5 font-medium has-focus-visible:outline-3 has-focus-visible:outline-sign ${
                v === "open" ? "has-checked:border-open has-checked:bg-open-bg has-checked:text-open-ink" : "has-checked:border-closed has-checked:bg-closed-bg has-checked:text-closed-ink"
              }`}
            >
              <input type="radio" name="pubWasOpen" value={v} defaultChecked={v === "open"} className="size-5 shrink-0 accent-ink" />
              {t(v)}
            </label>
          ))}
        </div>
      </fieldset>

      {errorKey && (
        <div role="alert" className="rounded-xl bg-closed-bg px-4 py-3 text-[15px] font-medium text-closed-ink">
          {errorKey === "signIn" || errorKey === "finishSignUp" ? (
            <Link href="/login" className="underline underline-offset-2">
              {t(`errors.${errorKey}`)}
            </Link>
          ) : (
            <p>{t(`errors.${errorKey}`)}</p>
          )}
        </div>
      )}

      <button type="submit" disabled={saving} className="btn btn-yellow h-14 rounded-xl text-lg">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <path d="m9 10 2 2 4-4" />
        </svg>
        {saving ? t("saving") : t("submit")}
      </button>
      <p className="-mt-3 text-center text-sm text-muted">{t("oncePerDay")}</p>
    </form>
  );
}
