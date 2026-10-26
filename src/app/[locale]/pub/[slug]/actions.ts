"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canDeletePubs } from "@/lib/auth/roles";
import { deletePub } from "@/lib/pubAdmin";

/** Deletes a pub (hides it; see deletePub). Only moderators and admins may. */
export async function deletePubAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canDeletePubs(user.role)) throw new Error("Only moderators and admins can delete pubs.");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { deleted: false };
  const deleted = await deletePub(id, user.id);
  // The pub drops out of lists, counts, the map and profiles, so everything is revalidated.
  revalidatePath("/", "layout");
  return { deleted };
}
