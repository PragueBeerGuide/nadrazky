"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/Avatar";
import { AVATAR_UPLOAD_SIDE, HOMETOWN_MAX } from "@/lib/profile";
import { saveProfile, type ProfileState } from "./actions";

type Props = { username: string; hometown: string | null; avatarUrl: string | null };

/** Shrinks a photo in the browser before upload; the server crops and re-encodes it anyway. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", 0.9),
  );
}

/** Hometown and profile picture. */
export function ProfileForm({ username, hometown, avatarUrl }: Props) {
  const t = useTranslations("profile");
  const [state, action, saving] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [picture, setPicture] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [pictureError, setPictureError] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  // After a successful save the page shows the new picture; start the picker over.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.saved) {
      setPicture(null);
      setPreview(null);
      setRemove(false);
    }
  }

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPictureError(false);
    try {
      const blob = await shrink(file);
      setPicture(blob);
      setPreview(URL.createObjectURL(blob));
      setRemove(false);
    } catch {
      setPictureError(true);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.delete("pictureFile");
    if (picture) formData.set("picture", new File([picture], "picture.jpg", { type: "image/jpeg" }));
    if (remove) formData.set("removePicture", "on");
    startTransition(() => action(formData));
  }

  const shown = remove ? null : (preview ?? avatarUrl);
  const error = pictureError ? "pictureFormat" : state.error;

  return (
    <form onSubmit={submit} className="card flex flex-col gap-6 p-5 md:p-7" aria-labelledby="details-title">
      <h2 id="details-title" className="text-[28px] md:text-[32px]">
        {t("detailsTitle")}
      </h2>

      <div className="flex flex-col gap-3">
        <span className="font-display text-[22px] font-bold">{t("picture")}</span>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar url={shown} name={username} size={88} className="border-2 border-rule" />
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-outline min-h-11 cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-yellow">
              <input type="file" name="pictureFile" accept="image/*" onChange={choose} className="sr-only" />
              {shown ? t("changePicture") : t("choosePicture")}
            </label>
            {shown && (
              <button
                type="button"
                onClick={() => {
                  setRemove(true);
                  setPicture(null);
                  setPreview(null);
                }}
                className="btn btn-outline min-h-11"
              >
                {t("removePicture")}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted">{t("pictureHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="hometown" className="flex items-baseline gap-2 font-display text-[22px] font-bold">
          {t("hometown")} <span className="label">{t("optional")}</span>
        </label>
        <input
          id="hometown"
          name="hometown"
          maxLength={HOMETOWN_MAX}
          defaultValue={hometown ?? ""}
          placeholder={t("hometownPlaceholder")}
          autoComplete="address-level2"
          className="field h-12"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-closed-bg px-4 py-3 text-[15px] font-medium text-closed-ink">
          {t(`errors.${error}`)}
        </p>
      )}
      {state.saved && !error && (
        <p role="status" className="rounded-xl bg-open-bg px-4 py-3 text-[15px] font-medium text-open-ink">
          {t("saved")}
        </p>
      )}

      <button type="submit" disabled={saving} className="btn btn-yellow h-14 self-start rounded-xl px-8 text-lg">
        {saving ? t("saving") : t("save")}
      </button>
    </form>
  );
}
