"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { friendActionSchema } from "@/lib/friend";
import { applyFriendAction } from "@/lib/friends";

/** What a friend action did, for the page to confirm: "sent" when a new request went out. */
export type FriendActionResult = { sent: boolean };

/**
 * Sends, cancels, accepts or declines a friend request, or removes a friend: the button
 * pressed names the action, a hidden field the other user. Only for users who have
 * finished signing up; an action that no longer applies changes nothing.
 */
export async function friendAction(formData: FormData): Promise<FriendActionResult> {
  const user = await getCurrentUser();
  if (!user || !signUpFinished(user)) throw new Error("Finish signing up to add friends.");
  const input = friendActionSchema.safeParse({ action: formData.get("action"), userId: formData.get("userId") });
  if (!input.success) return { sent: false };
  const change = await applyFriendAction(user.id, input.data.userId, input.data.action);
  // The friends page, the profile and the request count in the header on every page.
  revalidatePath("/", "layout");
  // "Send" to someone whose request was already there accepts it instead: no new request.
  return { sent: change?.kind === "insert" };
}
