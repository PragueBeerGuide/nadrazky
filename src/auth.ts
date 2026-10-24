/**
 * Auth.js: Google sign-in and email links, no passwords. Sessions are signed JWT cookies;
 * users, linked Google accounts and pending email links are stored with the Drizzle adapter.
 * Every sign-in method is switched on by its environment variables (src/lib/auth/config.ts).
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
import { sendSignInLink } from "@/lib/auth/email";

const enabled = authProviders();
const providers: Provider[] = [];

if (enabled.google) {
  providers.push(
    // Google only hands out verified addresses, so a Google sign-in may join an
    // account first made with an email link to the same address.
    Google({ allowDangerousEmailAccountLinking: true }),
  );
}

if (enabled.email) {
  providers.push({
    id: "email",
    type: "email",
    name: "Email",
    from: process.env.AUTH_EMAIL_FROM ?? "Nádražky <dev@localhost>",
    maxAge: 24 * 60 * 60,
    sendVerificationRequest: sendSignInLink,
    options: {},
  });
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers,
  secret: authSecret(),
  // The dev login can't create database sessions, so sessions are JWT cookies everywhere.
  session: { strategy: "jwt", maxAge: 90 * 24 * 60 * 60 },
  // next-intl sends /login to /cs/prihlaseni or /en/login.
  pages: { signIn: "/login", error: "/login", verifyRequest: "/login?sent=1" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
