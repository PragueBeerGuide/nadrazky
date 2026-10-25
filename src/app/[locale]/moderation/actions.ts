"use server";

import { revalidatePath } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canModerate } from "@/lib/auth/roles";
import { resolveReport } from "@/lib/reports";

/** Approve or reject a report; only moderators and admins may. */
export async function decideReport(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canModerate(user.role)) throw new Error("Only moderators and admins can review reports.");
  const id = Number(formData.get("id"));
  const decision = formData.get("decision") === "accept" ? "accepted" : "rejected";
  if (!Number.isInteger(id)) return;
  await resolveReport(id, user.id, decision);
  revalidatePath(getPathname({ locale: asLocale(String(formData.get("locale"))), href: "/moderation" }));
}
