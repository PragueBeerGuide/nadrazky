import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { authEnabled } from "./config";

export { signUpFinished } from "./signup";

/**
 * The signed-in user, read fresh from the database once per request, so a changed
 * role or username shows at once. Null when signed out or when accounts aren't set up.
 */
export const getCurrentUser = cache(async () => {
  if (!authEnabled()) return null;
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user ?? null;
});

