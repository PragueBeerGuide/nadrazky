"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { alreadyCheckedIn, checkInDay, checkInSchema } from "@/lib/checkin";
import { recentCheckInTimes } from "@/lib/checkins";

export type CheckInError = "signIn" | "finishSignUp" | "invalid" | "notFound" | "alreadyToday";
export type CheckInState = { error?: CheckInError };

/** Saves a check-in unless the user has already checked in at this pub today. */
export async function checkIn(_: CheckInState, formData: FormData): Promise<CheckInState> {
  const locale = asLocale(String(formData.get("locale")));
  const user = await getCurrentUser();
  if (!user) return { error: "signIn" };
  if (!signUpFinished(user)) return { error: "finishSignUp" };

  const input = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { error: "invalid" };
  const { slug, ...details } = input.data;

  const [pub] = await db.select({ id: schema.pubs.id }).from(schema.pubs).where(eq(schema.pubs.slug, slug));
  if (!pub) return { error: "notFound" };

  const now = new Date();
  if (alreadyCheckedIn(await recentCheckInTimes(user.id, pub.id, now), now)) return { error: "alreadyToday" };

  // The unique (user, pub, day) index settles two check-ins sent at the same moment.
  const saved = await db
    .insert(schema.checkins)
    .values({ userId: user.id, pubId: pub.id, createdAt: now, day: checkInDay(now), ...details })
    .onConflictDoNothing()
    .returning({ id: schema.checkins.id });
  if (!saved.length) return { error: "alreadyToday" };

  const pubPath = getPathname({ locale, href: { pathname: "/pub/[slug]", params: { slug } } });
  revalidatePath(pubPath);
  redirect(pubPath);
}
