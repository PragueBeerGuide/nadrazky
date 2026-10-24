"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { db, schema } from "@/db";
import { getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { safeReturnPath } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { usernameSchema } from "@/lib/auth/signup";

/** Where a sign-in comes back to: the login page, which sends a finished user on to `next`. */
function loginPage(formData: FormData) {
  const locale = asLocale(String(formData.get("locale")));
  const next = safeReturnPath(formData.get("next"), "");
  return getPathname({ locale, href: next ? { pathname: "/login", query: { next } } : "/login" });
}

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: loginPage(formData) });
}

export async function devSignIn(formData: FormData) {
  const back = loginPage(formData);
  try {
    await signIn("dev-login", { email: formData.get("email"), redirectTo: back });
  } catch (e) {
    // A failed sign-in is an AuthError; the redirect after success is rethrown as is.
    if (e instanceof AuthError) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${e.type}`);
    throw e;
  }
}

export type FinishState = {
  errors?: { username?: "invalid" | "taken"; adult?: "required" };
  values?: { username: string; language: string };
};

export async function finishSignUp(_: FinishState, formData: FormData): Promise<FinishState> {
  const user = await getCurrentUser();
  const locale = asLocale(String(formData.get("locale")));
  if (!user) redirect(getPathname({ locale, href: "/login" }));

  const values = { username: String(formData.get("username") ?? ""), language: String(formData.get("language")) };
  const username = usernameSchema.safeParse(values.username);
  const adult = formData.get("adult") === "on";
  const errors: FinishState["errors"] = {};
  if (!username.success) errors.username = "invalid";
  if (!adult) errors.adult = "required";

  if (username.success) {
    const [taken] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(sql`lower(${schema.users.username}) = ${username.data}`, ne(schema.users.id, user.id)));
    if (taken) errors.username = "taken";
  }
  if (!username.success || errors.username || errors.adult) return { errors, values };

  try {
    await db
      .update(schema.users)
      .set({
        username: username.data,
        language: asLocale(values.language),
        adultConfirmedAt: user.adultConfirmedAt ?? new Date(),
      })
      .where(eq(schema.users.id, user.id));
  } catch {
    // Someone took the username a moment ago (unique index).
    return { errors: { username: "taken" }, values };
  }
  // The header in the shared layout shows the new username.
  revalidatePath("/", "layout");
  redirect(safeReturnPath(formData.get("next"), getPathname({ locale, href: "/" })));
}

export async function logOut(formData: FormData) {
  const locale = asLocale(String(formData.get("locale")));
  await signOut({ redirectTo: getPathname({ locale, href: "/" }) });
}
