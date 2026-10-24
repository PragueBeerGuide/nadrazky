import { describe, expect, it } from "vitest";
import { authEnabled, authProviders, authSecret, devLoginEnabled, safeReturnPath } from "./config";

describe("devLoginEnabled", () => {
  it("is on under next dev", () => {
    expect(devLoginEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("is off in a production build unless asked for", () => {
    expect(devLoginEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "production", AUTH_DEV_LOGIN: "1" })).toBe(true);
  });

  it("is never on at Vercel, even when asked for", () => {
    expect(devLoginEnabled({ NODE_ENV: "development", VERCEL: "1" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "production", VERCEL: "1", AUTH_DEV_LOGIN: "1" })).toBe(false);
  });
});

describe("authSecret", () => {
  it("uses AUTH_SECRET when set", () => {
    expect(authSecret({ NODE_ENV: "production", AUTH_SECRET: "s3cret" })).toBe("s3cret");
  });

  it("has a fallback only where the dev login is on", () => {
    expect(authSecret({ NODE_ENV: "development" })).toBeTruthy();
    expect(authSecret({ NODE_ENV: "production" })).toBeUndefined();
    expect(authSecret({ NODE_ENV: "production", VERCEL: "1" })).toBeUndefined();
    expect(authEnabled({ NODE_ENV: "production", VERCEL: "1" })).toBe(false);
  });
});

describe("authProviders", () => {
  it("switches Google and email on by their variables", () => {
    expect(authProviders({ NODE_ENV: "production" })).toEqual({ google: false, email: false, dev: false });
    expect(
      authProviders({
        NODE_ENV: "production",
        AUTH_GOOGLE_ID: "id",
        AUTH_GOOGLE_SECRET: "secret",
        AUTH_RESEND_KEY: "re_key",
        AUTH_EMAIL_FROM: "Nádražky <a@b.cz>",
      }),
    ).toEqual({ google: true, email: true, dev: false });
  });

  it("needs both the Resend key and the sender for email links in production", () => {
    expect(authProviders({ NODE_ENV: "production", AUTH_RESEND_KEY: "re_key" }).email).toBe(false);
  });

  it("prints email links to the log in development", () => {
    expect(authProviders({ NODE_ENV: "development" }).email).toBe(true);
  });
});

describe("safeReturnPath", () => {
  it("keeps same-site paths", () => {
    expect(safeReturnPath("/en/pub/davle-remagen")).toBe("/en/pub/davle-remagen");
    expect(safeReturnPath("/cs/hospody?q=bufet")).toBe("/cs/hospody?q=bufet");
  });

  it("refuses other sites and odd values", () => {
    for (const v of ["https://evil.example", "//evil.example", "/\\evil.example", "pub", "", undefined, ["/a"]]) {
      expect(safeReturnPath(v, "/cs")).toBe("/cs");
    }
  });
});
