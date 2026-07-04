// tests/extract/golden.test.ts
import { describe, expect, test } from "bun:test";
import { extractVolume } from "../../lib/extract/extract.ts";
import type { HanSyllable } from "../../lib/extract/types.ts";

const syl = (tokens: { kind: string }[], han: string) =>
  tokens.find((t): t is HanSyllable => t.kind === "syl" && (t as HanSyllable).han === han)!;

describe("issue #3 golden entries", () => {
  test("【個人】: 我 carries 文/語 readings", () => {
    const r = extractVolume(process.cwd(), "09");
    const rec = r.words.find((w) => w.headword === "個人")!;
    const wo = syl(rec.senses[0]!.taigi, "我");
    expect(wo.readings.map((x) => [x.zhuyin, x.usages.map((u) => u.value).join("+")]))
      .toEqual([["ㄫㆦˋ", "文"], ["ㆣㄨㄚˋ", "語"]]);
  });
  test("【熬油】: 溶 has 文/漳/泉 readings, 火 has three unlabeled", () => {
    const r = extractVolume(process.cwd(), "23");
    const rec = r.words.find((w) => w.headword === "熬油")!;
    const sense2 = rec.senses.find((x) => x.nh === "2") ?? rec.senses[1]!;
    const rong = syl(sense2.taigi, "溶");
    expect(rong.readings.map((x) => [x.zhuyin, x.usages.map((u) => u.value).join("")]))
      .toEqual([["ㄧㆲˊ", "文"], ["ㄧㆧˊ", "漳"], ["ㄧㆫˊ", "泉"]]);
    const huo = syl(sense2.taigi, "火");
    expect(huo.readings.map((x) => x.zhuyin)).toEqual(["ㄏㆤˋ", "ㄏㄨㆤˋ", "ㄏㄜˋ"]);
    expect(huo.readings.every((x) => x.usages.length === 0)).toBe(true);
  });
});