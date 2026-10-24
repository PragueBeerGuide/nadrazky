import { z } from "zod";

export const REPORT_KINDS = ["closed", "reopened", "name", "hours", "address", "beers", "location", "other"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** Kinds that propose a new value for one of the pub's fields. */
export const VALUE_KINDS = ["name", "hours", "address", "beers"] as const satisfies readonly ReportKind[];
/** Kinds that only make sense with a description. */
export const MESSAGE_KINDS = ["location", "other"] as const satisfies readonly ReportKind[];

export const VALUE_MAX = 200;
export const MESSAGE_MAX = 1000;
/** Reports one user may send per Prague calendar day, across all pubs. */
export const DAILY_REPORT_LIMIT = 10;

export const needsValue = (kind: ReportKind) => (VALUE_KINDS as readonly ReportKind[]).includes(kind);
export const needsMessage = (kind: ReportKind) => (MESSAGE_KINDS as readonly ReportKind[]).includes(kind);

/** For a pub we list as closed the useful report is that it reopened; for any other, that it closed. */
export function kindsFor(pubStatus: string): ReportKind[] {
  const skip = pubStatus === "closed" ? "closed" : "reopened";
  return REPORT_KINDS.filter((k) => k !== skip);
}

export function reportLimitReached(sentToday: number) {
  return sentToday >= DAILY_REPORT_LIMIT;
}

const trimmed = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined), z.string().max(max).optional());

/**
 * The report form as posted. A value is required (and kept) only for value kinds;
 * a message is required for "location" and "other", optional otherwise.
 */
export const reportSchema = z
  .object({
    slug: z.string().min(1),
    kind: z.enum(REPORT_KINDS),
    value: trimmed(VALUE_MAX),
    message: trimmed(MESSAGE_MAX),
  })
  .superRefine((r, ctx) => {
    if (needsValue(r.kind) && !r.value) ctx.addIssue({ code: "custom", path: ["value"], message: "required" });
    if (needsMessage(r.kind) && !r.message) ctx.addIssue({ code: "custom", path: ["message"], message: "required" });
  })
  .transform((r) => ({ ...r, value: needsValue(r.kind) ? r.value : undefined }));
