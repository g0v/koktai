import { describe, expect, test } from "bun:test";
import { loadSyllables } from "../../lib/extract/syllables.ts";
import { normalizeTaigi } from "../../lib/extract/normalize.ts";
import { tokenizeTaigi, serializeTokens } from "../../lib/extract/tokenize.ts";
import type { HanSyllable } from "../../lib/extract/types.ts";
import { P } from "./_pua.ts";
import { taigiOf } from "./_taigiFixture.ts";

const s = loadSyllables(process.cwd());
const root = process.cwd();

const tokens = (volFile: string, match: (t: string) => boolean) =>
  tokenizeTaigi(normalizeTaigi(taigiOf(volFile, match, root), s), s);

describe("word-text tokenizer", () => {
  test("labeled chain 「我」(文)/…(語) — issue #3 example 1 (【個人】)", () => {
    const ts = tokens("beta09k.dic", (t) => t.includes("個") && t.includes("人") && t.includes("(可在副位)"));
    const wo = ts.find((t): t is HanSyllable => t.kind === "syl" && t.han === "我")!;
    expect(wo.readings).toEqual([
      { zhuyin: "ㄫㆦˋ", usages: [{ dim: "register", value: "文" }] },
      { zhuyin: "ㆣㄨㄚˋ", usages: [{ dim: "register", value: "語" }] },
    ]);
  });
  test("unlabeled alternates and geo chain (【八】heteronym 3)", () => {
    const ts = tokens("beta01k.dic", (t) => t.includes("[序位]"));
    const ba = ts.find((t): t is HanSyllable => t.kind === "syl" && t.han === "八")!;
    expect(ba.readings).toEqual([
      { zhuyin: "ㄅㆤㆷ", usages: [{ dim: "geo", value: "漳" }] },
      { zhuyin: "ㄅㄨㆤㆷ", usages: [{ dim: "geo", value: "廈" }, { dim: "geo", value: "泉" }] },
    ]);
  });
  test("quoted multi-syllable alternate zips (【八】heteronym 2: 第八/「ㄉㄨㆤ˫ㄅㄨㆤㆷ」)", () => {
    const ts = tokens("beta01k.dic", (t) => t.includes("[定位]"));
    const di = ts.filter((t): t is HanSyllable => t.kind === "syl").find((t) => t.han === "第")!;
    expect(di.readings.map((r) => r.zhuyin)).toEqual(["ㄉㆤ˫", "ㄉㄨㆤ˫"]);
  });
  test("round-trip is exact on all three fixtures", () => {
    for (const [f, m] of [
      ["beta09k.dic", (t: string) => t.includes("(可在副位)")],
      ["beta01k.dic", (t: string) => t.includes("[序位]")],
      ["beta01k.dic", (t: string) => t.includes("[定位]")],
    ] as const) {
      const norm = normalizeTaigi(taigiOf(f, m, root), s);
      expect(serializeTokens(norm, tokenizeTaigi(norm, s))).toBe(norm);
    }
  });
  test("contextual <k> attaches s.k reading to preceding base (8d44, not m3 twin)", () => {
    const input = `丌<k>${P("8d44")}</k>`;
    const ts = tokenizeTaigi(input, s);
    expect(serializeTokens(input, ts)).toBe(input);
    const ji = ts.find((t): t is HanSyllable => t.kind === "syl" && t.han === "丌")!;
    expect(ji.readings).toEqual([{ zhuyin: s.k["8d44"], usages: [] }]);
  });
});