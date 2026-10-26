/** The three user levels. Moderators and admins review reports, admins also edit rail data; roles are set in the database. */
export const ROLES = ["user", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Moderators and admins may review reports, and their own reports are approved at once. */
export function canModerate(role: Role | null | undefined) {
  return role === "moderator" || role === "admin";
}

/** Only admins link stations and rail lines (the admin pages under /admin). */
export function canEditRailData(role: Role | null | undefined) {
  return role === "admin";
}
