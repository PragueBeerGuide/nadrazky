"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDistance, NOTE_MAX } from "@/lib/checkin";
import { checkIn, type CheckInState } from "./actions";

type GeoError = "geoDenied" | "geoUnavailable" | "geoTimeout" | "geoUnsupported";

const drinks = ["hadBeer", "hadShot", "hadNonAlcoholic", "hadSnack"] as const;
const drinkLabels = { hadBeer: "beer", hadShot: "shot", hadNonAlcoholic: "nonAlcoholic", hadSnack: "snack" } as const;

/**
 * The check-in details, then one button: it asks the browser for its position and
 * sends it with the form. The server decides whether the position is close enough.
 */
export function CheckInForm({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations("checkIn");
  const [state, action, saving] = useActionState<CheckInState, FormData>(checkIn, {});
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<GeoError | null>(null);
  const [noteLength, setNoteLength] = useState(0);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setGeoError(null);
    if (!("geolocation" in navigator)) return setGeoError("geoUnsupported");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        formData.set("lat", String(position.coords.latitude));
        formData.set("lon", String(position.coords.longitude));
        formData.set("accuracy", String(position.coords.accuracy));
        startTransition(() => action(formData));
      },
      (error) => {
        setLocating(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED ? "geoDenied" : error.code === error.TIMEOUT ? "geoTimeout" : "geoUnavailable",
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    );
  }

  const errorKey = geoError ?? state.error;
  const busy = locating || saving;

  return (
    <form onSubmit={submit} className="card flex flex-col gap-6 p-5 md:p-7">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />

      <div className="flex gap-3 rounded-xl bg-sign-tint p-4 text-sign">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px]">{t("howTitle")}</h2>
          <p className="text-[15px] text-ink">{t("howText")}</p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 flex items-baseline gap-2 font-display text-[22px] font-bold">
          {t("hadTitle")} <span className="label">{t("optional")}</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {drinks.map((name) => (
            <label
              key={name}
              className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-field bg-white px-3.5 font-medium has-checked:border-sign has-checked:bg-sign-tint has-checked:text-sign has-focus-visible:outline-3 has-focus-visible:outline-yellow"
            >
              <input type="checkbox" name={name} className="size-5 shrink-0 accent-sign" />
              {t(drinkLabels[name])}
            </label>
          ))}
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
              className="flex size-12 cursor-pointer items-center justify-center rounded-xl border border-field bg-white font-mono text-lg font-semibold has-checked:border-ink has-checked:bg-yellow has-focus-visible:outline-3 has-focus-visible:outline-sign"
            >
              <input type="radio" name="rating" value={n} className="sr-only" aria-label={t("ratingValue", { count: n })} />
              <span aria-hidden="true">{n}</span>
            </label>
          ))}
          <label className="flex h-12 cursor-pointer items-center rounded-xl border border-field bg-white px-4 text-[15px] font-medium text-muted has-checked:border-ink has-checked:text-ink has-focus-visible:outline-3 has-focus-visible:outline-sign">
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
            <p>{t(`errors.${errorKey}`, { distance: formatDistance(state.distance ?? 0, locale) })}</p>
          )}
        </div>
      )}

      <button type="submit" disabled={busy} className="btn btn-yellow h-14 rounded-xl text-lg">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <path d="m9 10 2 2 4-4" />
        </svg>
        {locating ? t("locating") : saving ? t("saving") : t("submit")}
      </button>
    </form>
  );
}
