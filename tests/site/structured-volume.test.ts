import { describe, expect, test } from "bun:test";
import { getStructuredVolume } from "../../lib/site/structured-volume.ts";
import type { StructuredToken } from "../../lib/site/structured-volume.ts";

const root = process.cwd();

function sylToken(
  tokens: StructuredToken[],
  han: string,
): Extract<StructuredToken, { kind: "syl" }> {
  const t = tokens.find(
    (x): x is Extract<StructuredToken, { kind: "syl" }> => x.kind === "syl" && x.han === han,
  );
  expect(t).toBeDefined();
  return t!;
}

describe("structured volume view model", () => {
  test("volume 09: metadata, sections, and 【個人】 我 readings", () => {
    const vol = getStructuredVolume(root, "09");
    expect(vol.base).toBe("09");
    expect(vol.entryCount).toBeGreaterThan(0);
    expect(vol.sections.length).toBeGreaterThan(0);
    expect(vol.sections[0]!.id).toMatch(/^s-\d+$/);

    const entry = vol.sections
      .flatMap((s) => s.entries)
      .find((e) => e.headword === "個人");
    expect(entry).toBeDefined();
    const wo = sylToken(entry!.senses[0]!.taigi, "我");
    expect(wo.readings.map((r) => [r.zhuyin, r.register.join("+")])).toEqual([
      ["ㄫㆦˋ", "文"],
      ["ㆣㄨㄚˋ", "語"],
    ]);
    expect(wo.readings[0]!.geo).toEqual([]);
    expect(wo.readings[1]!.geo).toEqual([]);
  });
  test("volume 01: 【八荒】 preserves variant group alternatives", () => {
    const vol = getStructuredVolume(root, "01");
    const entry = vol.sections
      .flatMap((s) => s.entries)
      .find((e) => e.headword === "八荒");
    expect(entry).toBeDefined();
    const sense = entry!.senses.find((s) => s.nh === "1");
    expect(sense).toBeDefined();
    const variant = sense!.taigi.find((t) => t.kind === "variant");
    expect(variant).toBeDefined();
    if (variant?.kind !== "variant") return;
    expect(variant.alternatives.length).toBeGreaterThan(0);
    const firstAlt = variant.alternatives[0]!;
    expect(firstAlt.some((t) => t.kind === "syl" && t.han === "域")).toBe(true);
  });
  test("volume 01 ㄅㄚ section includes sinogram 八 before word entries", () => {
    const vol = getStructuredVolume(root, "01");
    const sec = vol.sections.find((s) => s.chapterZhuyin === "ㄅㄚ");
    expect(sec).toBeDefined();
    expect(sec!.sinograms.length).toBeGreaterThan(0);
    expect(sec!.sinograms.some((g) => g.han === "八")).toBe(true);
  });

  test("volume 01 ㄅㄚ section includes sinogram 八 before word entries", () => {
    const vol = getStructuredVolume(root, "01");
    const sec = vol.sections.find((s) => s.chapterZhuyin === "ㄅㄚ");
    expect(sec).toBeDefined();
    expect(sec!.sinograms.length).toBeGreaterThan(0);
    expect(sec!.sinograms.some((g) => g.han === "八")).toBe(true);
  });
});