"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { checkInDay, checkInSchema, judgeCheckIn } from "@/lib/checkin";
import { recentCheckInTimes } from "@/lib/checkins";

export type CheckInError = "signIn" | "finishSignUp" | "invalid" | "notFound" | "tooFar" | "alreadyToday";
export type CheckInState = { error?: CheckInError; distance?: number };

/**
 * Saves a check-in only if the posted position is within CHECKIN_RADIUS_M of the pub
 * and the user hasn't checked in there today. The browser sends its position; the
 * distance is worked out here, never trusted from the client.
 */
export async function checkIn(_: CheckInState, formData: FormData): Promise<CheckInState> {
  const locale = asLocale(String(formData.get("locale")));
  const user = await getCurrentUser();
  if (!user) return { error: "signIn" };
  if (!signUpFinished(user)) return { error: "finishSignUp" };

  const input = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { error: "invalid" };
  const { slug, lat, lon, accuracy, ...details } = input.data;

  const [pub] = await db
    .select({ id: schema.pubs.id, lat: schema.pubs.lat, lon: schema.pubs.lon, stationLat: schema.stations.lat, stationLon: schema.stations.lon })
    .from(schema.pubs)
    .innerJoin(schema.stations, eq(schema.stations.id, schema.pubs.stationId))
    .where(eq(schema.pubs.slug, slug));
  if (!pub) return { error: "notFound" };

  const now = new Date();
  const point = { lat: pub.lat ?? pub.stationLat, lon: pub.lon ?? pub.stationLon };
  const verdict = judgeCheckIn({ lat, lon }, point, await recentCheckInTimes(user.id, pub.id, now), now);
  if (!verdict.ok) return { error: verdict.reason, distance: verdict.distance };

  // The unique (user, pub, day) index settles two check-ins sent at the same moment.
  const saved = await db
    .insert(schema.checkins)
    .values({
      userId: user.id,
      pubId: pub.id,
      createdAt: now,
      day: checkInDay(now),
      ...details,
      distanceM: verdict.distance,
      accuracyM: accuracy == null ? null : Math.round(accuracy),
    })
    .onConflictDoNothing()
    .returning({ id: schema.checkins.id });
  if (!saved.length) return { error: "alreadyToday" };

  const pubPath = getPathname({ locale, href: { pathname: "/pub/[slug]", params: { slug } } });
  revalidatePath(pubPath);
  redirect(pubPath);
}
