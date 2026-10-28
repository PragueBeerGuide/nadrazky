"use server";

import { getCurrentUser } from "@/lib/auth/currentUser";
import { suggestionLimitReached, suggestionSchema } from "@/lib/suggestion";
import { countSuggestionsToday, createSuggestion } from "@/lib/suggestions";

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
