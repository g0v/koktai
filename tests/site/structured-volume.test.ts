import { describe, expect, test } from "bun:test";
import { getStructuredVolume } from "../../lib/site/structured-volume.ts";
import type { StructuredToken } from "../../lib/site/structured-volume.ts";

const root = process.cwd();

function sylToken(tokens: StructuredToken[], han: string): StructuredToken {
  const t = tokens.find((x) => x.han === han);
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
});