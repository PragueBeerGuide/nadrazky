import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** A user's profile picture. Its URL changes with every new picture (?v=), so it can be cached for good. */
export async function GET(_: Request, ctx: RouteContext<"/api/avatar/[id]">) {
  const { id } = await ctx.params;
  const [row] = await db.select({ image: schema.userAvatars.image }).from(schema.userAvatars).where(eq(schema.userAvatars.userId, id));
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
