"use client";

import { MapPinCheckInsideIcon } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AMOUNT_MAX, NOTE_MAX } from "@/lib/checkin";
import { checkIn, type CheckInState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const AMOUNTS = Array.from({ length: AMOUNT_MAX }, (_, i) => i + 1);
// The radio's own size and position would otherwise win over sr-only and take up room
const hidden = "sr-only absolute size-px";
// A tappable choice whose radio is hidden; it turns yellow when chosen
const tile =
  "relative flex cursor-pointer items-center border border-field bg-white text-ink has-focus-visible:outline-3 has-focus-visible:outline-sign has-data-checked:border-ink has-data-checked:bg-yellow";

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
    <div className="flex flex-col gap-2 rounded-xl border border-field bg-white px-3.5 py-2 has-[[data-slot=checkbox][data-checked]]:border-sign has-[[data-slot=checkbox][data-checked]]:bg-sign-tint">
      <Label className="min-h-10 cursor-pointer gap-2.5 text-base leading-normal has-data-checked:text-sign">
        <Checkbox name={name} checked={checked} onCheckedChange={onChange} className="size-5" />
        {label}
      </Label>
      {amount && checked && (
        <fieldset className="flex flex-col gap-2 pb-1.5" aria-describedby={missing ? `${amount.name}-error` : undefined}>
          <legend className="mb-2 text-sm font-semibold text-ink">{amount.legend}</legend>
          <RadioGroup name={amount.name} onValueChange={amount.onChoose} className="grid-cols-5 gap-1.5">
            {AMOUNTS.map((n) => (
              <Label key={n} className={cn(tile, "h-11 justify-center rounded-lg font-mono text-base font-semibold")}>
                <RadioGroupItem value={String(n)} className={hidden} />
                {n}
              </Label>
            ))}
          </RadioGroup>
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
    <Card render={<form onSubmit={submit} noValidate />} className="flex flex-col gap-6 p-5 md:p-7">
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
        <RadioGroup name="rating" defaultValue="" className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Label key={n} className={cn(tile, "size-12 justify-center rounded-xl font-mono text-lg font-semibold")}>
              <RadioGroupItem value={String(n)} className={hidden} aria-label={t("ratingValue", { count: n })} />
              <span aria-hidden="true">{n}</span>
            </Label>
          ))}
          <Label className={cn(tile, "h-12 rounded-xl px-4 text-[15px] text-muted-foreground has-data-checked:bg-white has-data-checked:text-ink")}>
            <RadioGroupItem value="" className={hidden} />
            {t("ratingNone")}
          </Label>
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="note" className="flex items-baseline gap-2 font-display text-[22px] font-bold">
            {t("noteLabel")} <span className="label">{t("optional")}</span>
          </label>
          <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
            {t("noteCount", { count: noteLength, max: NOTE_MAX })}
          </span>
        </div>
        <Textarea
          id="note"
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder={t("notePlaceholder")}
          onChange={(e) => setNoteLength(e.target.value.length)}
          className="min-h-24 resize-y"
        />
      </div>

      <fieldset className="flex flex-col">
        <legend className="mb-3 font-display text-[22px] font-bold">{t("openTitle")}</legend>
        <RadioGroup name="pubWasOpen" defaultValue="open" className="grid-cols-2 gap-2">
          {(["open", "closed"] as const).map((v) => (
            <Label
              key={v}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-field bg-white px-3.5 text-base leading-normal has-focus-visible:outline-3 has-focus-visible:outline-sign",
                v === "open"
                  ? "has-data-checked:border-open has-data-checked:bg-open-bg has-data-checked:text-open-ink"
                  : "has-data-checked:border-closed has-data-checked:bg-closed-bg has-data-checked:text-closed-ink",
              )}
            >
              <RadioGroupItem value={v} className="size-5 data-checked:border-ink data-checked:bg-ink" />
              {t(v)}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {errorKey && (
        <Alert variant="error" className="rounded-xl">
          {errorKey === "signIn" || errorKey === "finishSignUp" ? (
            <Link href="/login" className="underline underline-offset-2">
              {t(`errors.${errorKey}`)}
            </Link>
          ) : (
            <p>{t(`errors.${errorKey}`)}</p>
          )}
        </Alert>
      )}

      <Button variant="yellow" size="xl" type="submit" disabled={saving} className="h-14 rounded-xl text-lg">
        <MapPinCheckInsideIcon strokeWidth={2.2} className="size-5.5" />
        {saving ? t("saving") : t("submit")}
      </Button>
      <p className="-mt-3 text-center text-sm text-muted-foreground">{t("oncePerDay")}</p>
    </Card>
  );
}
