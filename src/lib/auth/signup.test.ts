import { describe, expect, it } from "vitest";
import { signUpFinished, suggestUsername, usernameSchema } from "./signup";

describe("usernameSchema", () => {
  it("accepts letters, digits and underscores and lower-cases them", () => {
    expect(usernameSchema.parse(" Pivar_42 ")).toBe("pivar_42");
  });

  it("refuses too short, too long and other characters", () => {
    for (const v of ["ab", "a".repeat(21), "jan novák", "jan.novak", "žluťoučký"]) {
      expect(usernameSchema.safeParse(v).success).toBe(false);
    }
  });
});

describe("suggestUsername", () => {
  it("starts from the name or the email", () => {
    expect(suggestUsername("Jan Novák")).toBe("jan_novak");
    expect(suggestUsername("jiri.dvorak+pivo@example.com")).toBe("jiri_dvorak_pivo");
  });

  it("gives nothing when there is too little to go on", () => {
    expect(suggestUsername("J")).toBe("");
    expect(suggestUsername(null)).toBe("");
  });

  it("is always a valid username when it gives one", () => {
    const s = suggestUsername("A very long name that keeps going");
    expect(usernameSchema.safeParse(s).success).toBe(true);
  });
});

describe("signUpFinished", () => {
  it("needs both a username and the 18+ confirmation", () => {
    expect(signUpFinished({ username: "pivar", adultConfirmedAt: new Date() })).toBe(true);
    expect(signUpFinished({ username: null, adultConfirmedAt: new Date() })).toBe(false);
    expect(signUpFinished({ username: "pivar", adultConfirmedAt: null })).toBe(false);
  });
});
