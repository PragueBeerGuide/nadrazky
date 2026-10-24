"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { AvatarError, processAvatar } from "@/lib/avatar";
import { AVATAR_MAX_BYTES, hometownSchema } from "@/lib/profile";

export type ProfileState = {
  saved?: boolean;
  error?: "signIn" | "hometown" | "pictureTooBig" | "pictureFormat";
};

/** Saves the hometown and, when given, a new profile picture or its removal. */
export async function saveProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user || !signUpFinished(user)) return { error: "signIn" };

  const hometown = hometownSchema.safeParse(formData.get("hometown"));
  if (!hometown.success) return { error: "hometown" };

  const picture = formData.get("picture");
  const removePicture = formData.get("removePicture") === "on";
  let image: Buffer | null = null;
  if (picture instanceof File && picture.size > 0 && !removePicture) {
    if (picture.size > AVATAR_MAX_BYTES) return { error: "pictureTooBig" };
    try {
      image = await processAvatar(Buffer.from(await picture.arrayBuffer()));
    } catch (e) {
      if (e instanceof AvatarError) return { error: "pictureFormat" };
      throw e;
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    if (image) {
      await tx
        .insert(schema.userAvatars)
        .values({ userId: user.id, image, updatedAt: now })
        .onConflictDoUpdate({ target: schema.userAvatars.userId, set: { image, updatedAt: now } });
    } else if (removePicture) {
      await tx.delete(schema.userAvatars).where(eq(schema.userAvatars.userId, user.id));
    }
    await tx
      .update(schema.users)
      .set({
        hometown: hometown.data,
        ...(image ? { avatarUpdatedAt: now } : removePicture ? { avatarUpdatedAt: null } : {}),
      })
      .where(eq(schema.users.id, user.id));
  });
  // The header shows the picture on every page.
  revalidatePath("/", "layout");
  return { saved: true };
}
