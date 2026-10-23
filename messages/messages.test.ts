import { describe, expect, it } from "vitest";
import cs from "./cs.json";
import en from "./en.json";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : keys(v, `${prefix}${k}.`)));
}

function values(tree: Tree): string[] {
  return Object.values(tree).flatMap((v) => (typeof v === "string" ? [v] : values(v)));
}

describe("messages", () => {
  it("has the same keys in Czech and English", () => {
    expect(keys(cs).sort()).toEqual(keys(en).sort());
  });

  it("has no empty texts", () => {
    for (const text of [...values(cs), ...values(en)]) expect(text.trim()).not.toBe("");
  });
});
