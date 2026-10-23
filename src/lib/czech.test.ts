import { describe, expect, it } from "vitest";
import { czechInitial } from "./czech";

describe("czechInitial", () => {
  it("treats Ch as one letter", () => {
    expect(czechInitial("Cheb")).toBe("CH");
    expect(czechInitial("Chomutov")).toBe("CH");
    expect(czechInitial("Cerhovice")).toBe("C");
  });

  it("keeps Č, Ř, Š and Ž as letters of their own", () => {
    expect(czechInitial("Čerčany")).toBe("Č");
    expect(czechInitial("Řevnice")).toBe("Ř");
    expect(czechInitial("Šťáhlavy")).toBe("Š");
    expect(czechInitial("Žďár nad Sázavou")).toBe("Ž");
  });

  it("files accented vowels and Ď, Ť, Ň under the plain letter", () => {
    expect(czechInitial("Úvaly")).toBe("U");
    expect(czechInitial("Ústí nad Labem")).toBe("U");
    expect(czechInitial("Ťapka")).toBe("T");
  });

  it("upper-cases the letter", () => {
    expect(czechInitial("brno")).toBe("B");
  });
});
