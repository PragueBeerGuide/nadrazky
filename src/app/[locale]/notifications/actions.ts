"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { markRead } from "@/lib/notifications";

/** Marks one of the signed-in user's notifications read, or all of them without an id. */
export async function readNotifications(id?: number) {
  const user = await getCurrentUser();
  if (!user) return;
  if (id !== undefined && !Number.isInteger(id)) return;
  await markRead(user.id, id);
  // The bell is in the header on every page.
  revalidatePath("/", "layout");
}
