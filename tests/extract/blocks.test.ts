// tests/extract/blocks.test.ts
import { describe, expect, test } from "bun:test";
import { recodeDicFile } from "../../lib/dic/cp950.ts";
import { splitVolume } from "../../lib/extract/blocks.ts";

const v01 = splitVolume(recodeDicFile("beta01k.dic"));

describe("volume block splitting", () => {
  test("first chapter is ㄅㄚ", () => {
    expect(v01.chapters[0]).toEqual({ line: 3, zhuyin: "ㄅㄚ" });
  });
  test("first sinogram block is 八 with 3 reading lines", () => {
    const b = v01.sinograms[0]!;
    expect(b.line).toBe(9);
    expect(b.charLine).toContain("八");
    expect(b.charLine).toContain("布拔切，黠韻");
    expect(b.readingLines.map((r) => r.text.slice(0, 7))).toEqual([
      "~fm7;國音",
      "~fm7;台甘",
      "~fm7;普閩",
    ]);
  });
  test("first word line is 【八】1 [名]", () => {
    const w = v01.words[0]!;
    expect(w.text).toContain("~t96;【~fb7bb1;八");
    expect(w.text).toContain("[名] 數目");
    expect(v01.chapterOf(w.line)).toBe("ㄅㄚ");
  });
  test("totals for the volume", () => {
    expect(v01.sinograms.length).toBeGreaterThan(300);
    expect(v01.words.length).toBeGreaterThan(1500);
  });
});