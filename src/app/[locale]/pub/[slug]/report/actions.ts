"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { reportLimitReached, reportSchema } from "@/lib/report";
import { countReportsToday } from "@/lib/reports";

export type ReportState = {
  done?: boolean;
  error?: "signIn" | "finishSignUp" | "notFound" | "limit";
  fields?: { kind?: boolean; value?: boolean; message?: boolean };
  values?: { kind: string; value: string; message: string };
};

/** Stores a "report a change" for a moderator to review. */
export async function submitReport(_: ReportState, formData: FormData): Promise<ReportState> {
  const values = {
    kind: String(formData.get("kind") ?? ""),
    value: String(formData.get("value") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const user = await getCurrentUser();
  if (!user) return { error: "signIn", values };
  if (!signUpFinished(user)) return { error: "finishSignUp", values };

  const input = reportSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) {
    const fields = Object.fromEntries(input.error.issues.map((i) => [String(i.path[0]), true]));
    return { fields, values };
  }
  const { slug, kind, value, message } = input.data;

  const [pub] = await db.select({ id: schema.pubs.id }).from(schema.pubs).where(eq(schema.pubs.slug, slug));
  if (!pub) return { error: "notFound", values };
  if (reportLimitReached(await countReportsToday(user.id))) return { error: "limit", values };

  await db.insert(schema.pubReports).values({ pubId: pub.id, userId: user.id, kind, value, message });
  return { done: true };
}
