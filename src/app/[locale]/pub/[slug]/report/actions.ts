"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { reportLimitApplies, reportLimitReached, reportSchema } from "@/lib/report";
import { countReportsToday, createReport } from "@/lib/reports";
import { livePub } from "@/lib/queries";

export type ReportState = {
  done?: boolean;
  /** A moderator's or admin's report is approved and applied at once. */
  autoApproved?: boolean;
  error?: "signIn" | "finishSignUp" | "notFound" | "limit";
  fields?: { kind?: boolean; value?: boolean; message?: boolean };
  values?: { kind: string; value: string; message: string };
};

/** Stores a "report a change": for review, or approved at once when a moderator or admin sends it. */
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

  const [pub] = await db.select({ id: schema.pubs.id }).from(schema.pubs).where(and(eq(schema.pubs.slug, slug), livePub));
  if (!pub) return { error: "notFound", values };
  if (reportLimitApplies(user.role) && reportLimitReached(await countReportsToday(user.id))) {
    return { error: "limit", values };
  }

  const { autoApproved } = await createReport({ pubId: pub.id, user, kind, value, message });
  return { done: true, autoApproved };
}
