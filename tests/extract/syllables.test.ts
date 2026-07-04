// tests/extract/syllables.test.ts
import { describe, expect, test } from "bun:test";
import { loadSyllables, classifyPua, puaHex } from "../../lib/extract/syllables.ts";

const s = loadSyllables(process.cwd());

describe("syllable inventory", () => {
  test("m3 reading classification (font/m3.json:2 is \"fab6\": \"ㄅㄚ\")", () => {
    expect(s.m3["fab6"]).toBe("ㄅㄚ");
    expect(classifyPua(String.fromCodePoint(0xffab6), s))
      .toEqual({ type: "reading", zhuyin: "ㄅㄚ" });
  });
  test("bare PUA uses m3 when hex is in both tables (8dd6)", () => {
    expect(s.k["8dd6"]).toBe("ㄤˇ");
    expect(s.m3["8dd6"]).toBe("ㄩㄣˋ");
    expect(classifyPua(String.fromCodePoint(0xf8dd6), s))
      .toEqual({ type: "reading", zhuyin: "ㄩㄣˋ" });
  });
  test("bare PUA uses m3 when hex is in both tables (8d44)", () => {
    expect(s.k["8d44"]).toBe("˙ㆤ");
    expect(s.m3["8d44"]).toBe("ㄗㄨㄥ");
    expect(classifyPua(String.fromCodePoint(0xf8d44), s))
      .toEqual({ type: "reading", zhuyin: "ㄗㄨㄥ" });
  });
  test("circled digit is a symbol", () => {
    expect(classifyPua(String.fromCodePoint(0xfc6a1), s)).toEqual({ type: "symbol", text: "①" });
  });
  test("unknown PUA is a glyph", () => {
    expect(classifyPua(String.fromCodePoint(0xf0001), s)).toEqual({ type: "glyph" });
  });
  test("puaHex mirrors lib/dic astralCode: U+FFAB6 − 0xF0000 = 0xFAB6", () => {
    expect(puaHex(String.fromCodePoint(0xffab6))).toBe("fab6");
  });
});