/**
 * Which sign-in methods are switched on, read from environment variables.
 * Kept free of Next.js and Auth.js imports so it can be unit tested.
 */
type Env = Record<string, string | undefined>;

/**
 * The dev login signs anyone in by typing an email, with no check. It is for local
 * development and the end-to-end tests only: on by default under `next dev`, opt-in
 * with AUTH_DEV_LOGIN=1 for a local production build, and never on Vercel.
 */
export function devLoginEnabled(env: Env = process.env) {
  if (env.VERCEL) return false;
  return env.NODE_ENV === "development" || env.AUTH_DEV_LOGIN === "1";
}

/** A fixed secret for local development; production must set AUTH_SECRET. */
const DEV_SECRET = "nadrazky-local-development-secret-not-for-production";

export function authSecret(env: Env = process.env) {
  return env.AUTH_SECRET || (devLoginEnabled(env) ? DEV_SECRET : undefined);
}

export function authProviders(env: Env = process.env) {
  return {
    google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    dev: devLoginEnabled(env),
  };
}

/** Accounts work only with a secret; without one the site runs signed-out. */
export function authEnabled(env: Env = process.env) {
  return Boolean(authSecret(env));
}

/** Only same-site paths are allowed as the place to return to after signing in. */
export function safeReturnPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
