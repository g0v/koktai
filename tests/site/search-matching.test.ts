import { describe, expect, test } from "bun:test";
import type { SuggestRow } from "../../src/client/protocol.ts";
import {
  buildSnippetAround,
  entryHref,
  formatVolumeLabel,
  rankSuggestRows,
  stripTone,
} from "../../src/client/search-matching.ts";

describe("search-matching", () => {
  test("stripTone removes tone marks and spaces", () => {
    expect(stripTone("ㄅㄚ ˊ")).toBe("ㄅㄚ");
  });

  test("formatVolumeLabel uses local numerals", () => {
    expect(formatVolumeLabel("01")).toBe("卷一");
    expect(formatVolumeLabel("26")).toBe("卷二十六");
  });

  test("entryHref respects base path and anchor kind", () => {
    expect(entryHref("/koktai/", "01", 0, 182)).toBe(
      "/koktai/01.html#w-182",
    );
    expect(entryHref("/koktai/", "01", 1, 1)).toBe("/koktai/01.html#c-1");
  });

  test("rankSuggestRows orders exact before prefix before contains", () => {
    const rows: SuggestRow[] = [
      ["八卦", "ㄅㄚ ㄍㄨㄚˋ", "01", 10, 0, 1],
      ["八", "ㄅㄚ", "01", 1, 1, 1],
      ["喇叭", "ㄌㄚˇ", "08", 277, 0, 1],
    ];
    const ranked = rankSuggestRows(rows, "八");
    expect(ranked.map((r) => r[0])).toEqual(["八", "八卦"]);
  });

  test("rankSuggestRows matches tone-stripped zhuyin", () => {
    const rows: SuggestRow[] = [
      ["□", "ㄅㄚˊ", "01", 309, 1, 2],
      ["爸", "ㄅㄚˋ", "08", 50, 0, 3],
    ];
    const ranked = rankSuggestRows(rows, "ㄅㄚˊ");
    expect(ranked.length).toBe(2);
    expect(ranked[0]![0]).toBe("□");
  });

  test("buildSnippetAround escapes and marks match", () => {
    const html = buildSnippetAround("熬油八味", 2, 3);
    expect(html).toBe("熬油<mark>八</mark>味");
  });
});