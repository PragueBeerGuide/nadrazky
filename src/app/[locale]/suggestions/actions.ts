"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canDecideSuggestions } from "@/lib/auth/roles";
import { suggestionLimitReached, suggestionSchema } from "@/lib/suggestion";
import { countSuggestionsToday, createSuggestion, resolveSuggestion } from "@/lib/suggestions";

export type SuggestionState = {
  done?: boolean;
  error?: "message" | "limit";
  message?: string;
};

/** Stores a "suggest an improvement" from anyone, signed in or not. */
export async function submitSuggestion(_: SuggestionState, formData: FormData): Promise<SuggestionState> {
  const message = String(formData.get("message") ?? "");
  const input = suggestionSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { error: "message", message };
  // A filled-in honeypot is a bot: pretend it worked and keep nothing.
  if (input.data.website) return { done: true };

  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  if (suggestionLimitReached(await countSuggestionsToday(userId), !!user)) return { error: "limit", message };

  await createSuggestion({ userId, message: input.data.message, page: input.data.page });
  return { done: true };
}

/** Approve or decline a pending suggestion; only admins may. */
export async function decideSuggestion(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canDecideSuggestions(user.role)) throw new Error("Only admins can decide on suggestions.");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await resolveSuggestion(id, user.id, formData.get("decision") === "approve" ? "approved" : "declined");
  // The moderation page, and the bell and the waiting count in the header on every page.
  revalidatePath("/", "layout");
}
