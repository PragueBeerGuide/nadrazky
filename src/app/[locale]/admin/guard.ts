import "server-only";
import { notFound, redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canEditRailData } from "@/lib/auth/roles";

/** Admin pages: signed-out visitors go to log in and come back to `here`; everyone but admins gets a 404. */
export async function requireAdminPage(locale: Locale, here: string) {
  const user = await getCurrentUser();
  if (!user) redirect(getPathname({ locale, href: { pathname: "/login", query: { next: here } } }));
  if (!canEditRailData(user.role)) notFound();
  return user;
}
