import { z } from "zod";
import { fold } from "@/lib/slug";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Letters a–z, digits and underscores; shown as @username next to check-ins. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN)
  .max(USERNAME_MAX)
  .regex(/^[a-z0-9_]+$/);

/** "Jan Novák" or "jan.novak@example.com" -> "jan_novak", as a starting point the user can change. */
export function suggestUsername(nameOrEmail: string | null | undefined) {
  const base = fold((nameOrEmail ?? "").split("@")[0])
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, USERNAME_MAX);
  return base.length >= USERNAME_MIN ? base : "";
}

/** Sign-up is finished once the user has a username and has confirmed they are 18+. */
export function signUpFinished(user: { username: string | null; adultConfirmedAt: Date | null }) {
  return Boolean(user.username && user.adultConfirmedAt);
}
