import { z } from "zod";
import { canModerate, type Role } from "@/lib/auth/roles";

/** In the order the form lists them. "reopened" is "it's open". */
export const REPORT_KINDS = ["reopened", "closed", "name", "hours", "address", "beers", "location", "other"] as const;
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

/**
 * The status reports worth offering: "it's open" (kind "reopened") unless we already list the
 * pub as open, "closed for good" unless we already list it as closed. A pub of unknown status
 * gets both.
 */
export function kindsFor(pubStatus: string): ReportKind[] {
  return REPORT_KINDS.filter(
    (k) => !(k === "reopened" && pubStatus === "open") && !(k === "closed" && pubStatus === "closed"),
  );
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

/** Reports from moderators and admins are approved as they are sent; everyone else's wait for review. */
export function isAutoApproved(role: Role) {
  return canModerate(role);
}

/** Moderators and admins fix data in bulk, so the daily limit applies to regular users only. */
export function reportLimitApplies(role: Role) {
  return !canModerate(role);
}

export type PubChange = {
  status?: "open" | "closed";
  closedYear?: number | null;
  name?: string;
  openingHours?: string;
  address?: string;
  beers?: string;
  /** "Last confirmed" on the pub page: an approved open/closed report confirms it now. */
  lastConfirmedAt?: Date;
};

/**
 * What an approved report changes on the pub. A wrong position and "something else"
 * are free text, so they change nothing automatically and are fixed by hand.
 */
export function changeFor(kind: ReportKind, value: string | null | undefined, now = new Date()): PubChange | null {
  switch (kind) {
    case "closed":
      return { status: "closed", closedYear: now.getFullYear(), lastConfirmedAt: now };
    case "reopened":
      return { status: "open", closedYear: null, lastConfirmedAt: now };
    case "name":
      return value ? { name: value } : null;
    case "hours":
      return value ? { openingHours: value } : null;
    case "address":
      return value ? { address: value } : null;
    case "beers":
      return value ? { beers: value } : null;
    case "location":
    case "other":
      return null;
  }
}
