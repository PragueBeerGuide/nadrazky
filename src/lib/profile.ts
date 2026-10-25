import { z } from "zod";

export const HOMETOWN_MAX = 60;
/** The biggest picture the server accepts; the browser shrinks photos well below this first. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Side of the square the browser shrinks a photo to before uploading it. */
export const AVATAR_UPLOAD_SIDE = 768;

/** Optional hometown: trimmed, empty means none. */
export const hometownSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ") : null),
  z.string().max(HOMETOWN_MAX).nullable(),
);

/** The address of a user's profile picture, or null without one; the date makes each version a new URL. */
export function avatarUrl(userId: string, avatarUpdatedAt: Date | string | null | undefined) {
  return avatarUpdatedAt ? `/api/avatar/${userId}?v=${new Date(avatarUpdatedAt).getTime()}` : null;
}
