import { describe, expect, test } from "bun:test";
import { recodeDicFile } from "../../lib/dic/cp950.ts";
import { splitVolume } from "../../lib/extract/blocks.ts";
import { loadSyllables } from "../../lib/extract/syllables.ts";
import { parseWord } from "../../lib/extract/word-readings.ts";

const s = loadSyllables(process.cwd());
const v01 = splitVolume(recodeDicFile("beta01k.dic"));

describe("word records", () => {
  test("【八卦】 head readings", () => {
    const raw = v01.words.find((w) => w.text.includes("卦") && w.text.includes("伏"))!;
    const rec = parseWord(raw, "01", "ㄅㄚ", s, process.cwd())!;
    expect(rec.headword).toBe("八卦");
    expect(rec.head.map((h) => h.han)).toEqual(["八", "卦"]);
    expect(rec.head[0]!.readings[0]!.zhuyin).toBe("ㄅㄚ");
    expect(rec.senses[0]!.pos).toBe("[數帶名詞]");
  });

  test("inline (台) in 國語 sentence preserved in taigi (【浮】)", () => {
    const v04 = splitVolume(recodeDicFile("beta04k.dic"));
    const raw = v04.words.find(
      (w) => w.text.includes("浮") && w.text.includes("性子輕浮急躁") && w.text.includes("(台)"),
    );
    expect(raw, "fixture: 【浮】 with inline (台)").toBeDefined();
    const rec = parseWord(raw!, "04", "ㄈㄨˊ", s, process.cwd())!;
    const taigiText = rec.senses
      .flatMap((sense) => sense.taigi)
      .filter((t) => t.kind === "syl")
      .map((t) => (t.kind === "syl" ? t.han : ""))
      .join("");
    expect(taigiText.length).toBeGreaterThan(0);
    expect(rec.senses.some((sense) => sense.mandarin.some((m) => m.includes("(台)")))).toBe(true);
  });
});