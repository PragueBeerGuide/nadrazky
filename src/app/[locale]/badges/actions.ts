"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { markBadgesSeen } from "@/lib/userBadges";

/** The user closed the "new badge" popup: it doesn't come back for these levels. */
export async function badgesSeen(ids: number[]) {
  const user = await getCurrentUser();
  const input = z.array(z.number().int().positive()).max(500).safeParse(ids);
  if (!user || !input.success) return;
  await markBadgesSeen(user.id, input.data);
}
