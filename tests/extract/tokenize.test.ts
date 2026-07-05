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
  test("arrow completion after unresolved contextual <k> does not leak tag fragments", () => {
    const input = `<k>${P("8cc4")}</k>${P("fab9")}→${P("fab6")}`;
    const norm = normalizeTaigi(input, s);
    const ts = tokenizeTaigi(norm, s);
    const serialized = serializeTokens(norm, ts);

    expect(norm).toContain("<k>");
    expect(serialized).toBe(norm);
    expect(ts).not.toContainEqual(expect.objectContaining({ kind: "prose", text: "</k>" }));
    expect(ts).not.toContainEqual(expect.objectContaining({ kind: "syl", han: ">" }));
  });
  test("arrow completion reuses the whole k-wrapped base", () => {
    const input = `<k>䩌</k>${P("9ef6")}→${P("9451")}痕${P("9b9f")}。`;
    const norm = normalizeTaigi(input, s);
    const ts = tokenizeTaigi(norm, s);
    const serialized = serializeTokens(norm, ts);

    expect(serialized).toBe(norm);
    expect(ts).not.toContainEqual(expect.objectContaining({ kind: "prose", text: "</k>" }));
    expect(ts).not.toContainEqual(expect.objectContaining({ kind: "syl", han: ">" }));
  });
  test("variant group trailing ：訓讀 → usages on VariantGroup", () => {
    const input = `字${P("fab6")}(/濟/多：訓讀)`;
    const ts = tokenizeTaigi(input, s);
    const v = ts.find((t) => t.kind === "variant")!;
    expect(v.kind).toBe("variant");
    if (v.kind !== "variant") return;
    expect(v.alternatives.length).toBe(2);
    expect(v.usages).toEqual([{ dim: "phenomenon", value: "訓讀" }]);
    expect(serializeTokens(input, ts)).toBe(input);
  });
  test("positional label zip — readings zip to (漳/泉) by index", () => {
    const h1 = "fab6";
    const h2 = "fab7";
    const input = `煮${P(h1)}/${P(h2)}(漳/泉)`;
    const ts = tokenizeTaigi(input, s);
    const zhu = ts.find((t): t is HanSyllable => t.kind === "syl" && t.han === "煮")!;
    expect(zhu.readings).toHaveLength(2);
    expect(zhu.readings[0]).toEqual({
      zhuyin: s.m3[h1],
      usages: [{ dim: "geo", value: "漳" }],
    });
    expect(zhu.readings[1]).toEqual({
      zhuyin: s.m3[h2],
      usages: [{ dim: "geo", value: "泉" }],
    });
    expect(serializeTokens(input, ts)).toBe(input);
  });
  test("direct quote-scope 「我…」(文)/…(語) — register labels without corpus fixture", () => {
    const hWen = "9b44";
    const hYu = "98a7";
    const input = `「我${P(hWen)}」(文)/${P(hYu)}(語)`;
    const ts = tokenizeTaigi(input, s);
    const wo = ts.find((t): t is HanSyllable => t.kind === "syl" && t.han === "我")!;
    expect(wo.readings).toEqual([
      { zhuyin: s.m3[hWen], usages: [{ dim: "register", value: "文" }] },
      { zhuyin: s.m3[hYu], usages: [{ dim: "register", value: "語" }] },
    ]);
    expect(serializeTokens(input, ts)).toBe(input);
  });
  test("variant splitter keeps k tags atomic", () => {
    const input = `侂${P("8cc4")}(/<k>挱</k>/${P("fab6")})`;
    const ts = tokenizeTaigi(input, s);
    const v = ts.find((t) => t.kind === "variant")!;

    expect(v.kind).toBe("variant");
    if (v.kind !== "variant") return;
    expect(v.alternatives.length).toBe(2);
    expect(JSON.stringify(v)).not.toContain('"text":"<"');
    expect(JSON.stringify(v)).not.toContain('"text":"k>"');
    expect(JSON.stringify(v)).not.toContain('"han":">"');
  });
  test("plain variant group (/濟/多) — alternatives only, usages []", () => {
    const input = `字${P("fab6")}(/濟/多)`;
    const ts = tokenizeTaigi(input, s);
    const v = ts.find((t) => t.kind === "variant")!;
    expect(v.kind).toBe("variant");
    if (v.kind !== "variant") return;
    expect(v.alternatives).toHaveLength(2);
    expect(v.usages).toEqual([]);
    expect(serializeTokens(input, ts)).toBe(input);
  });
});