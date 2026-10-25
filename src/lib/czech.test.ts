import { describe, expect, it } from "vitest";
import { compareCzech, czechInitial } from "./czech";

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

describe("compareCzech", () => {
  it("sorts by the Czech alphabet, not by bytes", () => {
    const stations = ["Vysoké Mýto - Město", "Česká Třebová", "Čachnov", "Svitavy", "Cerhenice", "Brno hl. n.", "Třemošnice"];
    expect([...stations].sort(compareCzech)).toEqual([
      "Brno hl. n.",
      "Cerhenice",
      "Čachnov",
      "Česká Třebová",
      "Svitavy",
      "Třemošnice",
      "Vysoké Mýto - Město",
    ]);
  });

  it("puts Ch after H, and Ř, Š, Ž after R, S, Z", () => {
    const names = ["Žďár nad Sázavou", "Cheb", "Zlín", "Hodonín", "Šumperk", "Řevnice", "Rokycany", "Sokolov", "Ivančice"];
    expect([...names].sort(compareCzech)).toEqual([
      "Hodonín",
      "Cheb",
      "Ivančice",
      "Rokycany",
      "Řevnice",
      "Sokolov",
      "Šumperk",
      "Zlín",
      "Žďár nad Sázavou",
    ]);
  });

  it("doesn't let accents on vowels break the order", () => {
    expect(["Úvaly", "Uhříněves", "Ústí nad Labem", "Tábor"].sort(compareCzech)).toEqual(["Tábor", "Uhříněves", "Ústí nad Labem", "Úvaly"]);
  });
});
