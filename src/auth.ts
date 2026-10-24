/**
 * Auth.js: sign-in with a Google account only, no passwords. Sessions are signed JWT
 * cookies; users and their linked Google accounts are stored with the Drizzle adapter.
 * Google is switched on by its environment variables (src/lib/auth/config.ts).
 */
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db, schema } from "@/db";
import { authProviders, authSecret } from "@/lib/auth/config";

const enabled = authProviders();
const providers: Provider[] = [];

if (enabled.google) {
  providers.push(Google);
}

if (enabled.dev) {
  // Local development and end-to-end tests only (see devLoginEnabled): signs in by email, no check.
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = z.email().safeParse(String(credentials?.email ?? "").trim().toLowerCase());
        if (!email.success) return null;
        const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email.data));
        const user =
          existing ??
          (await db.insert(schema.users).values({ email: email.data, emailVerified: new Date() }).returning())[0];
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

const adapter = DrizzleAdapter(db, {
  usersTable: schema.users,
  accountsTable: schema.accounts,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...adapter,
    // Only which Google account it is matters; Google's tokens are never used, so not kept.
    linkAccount: (account) =>
      adapter.linkAccount!({ ...account, access_token: undefined, refresh_token: undefined, id_token: undefined }),
  },
  providers,
  secret: authSecret(),
  // The dev login can't create database sessions, so sessions are JWT cookies everywhere.
  session: { strategy: "jwt", maxAge: 90 * 24 * 60 * 60 },
  // next-intl sends /login to /cs/prihlaseni or /en/login.
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
