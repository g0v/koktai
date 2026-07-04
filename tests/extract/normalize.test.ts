import { describe, expect, test } from "bun:test";
import { loadSyllables } from "../../lib/extract/syllables.ts";
import { normalizeTaigi } from "../../lib/extract/normalize.ts";
import { P } from "./_pua.ts";

const s = loadSyllables(process.cwd());
const [h1, h2] = Object.keys(s.m3).slice(0, 2) as [string, string];

describe("normalizeTaigi (port of han2edu 臺文格式正規化)", () => {
  test("circled digit astral → standard ①", () => {
    const circled = String.fromCodePoint(0xfc6a1);
    expect(normalizeTaigi(`第${circled}項`, s)).toBe("第①項");
  });

  test("k→m3 code swap (han2edu test_換做注音表的編號)", () => {
    const m3Hex = s.m3Reverse["ㄤˇ"]!;
    expect(normalizeTaigi(`丌<k>${P("8dd6")}</k>官`, s)).toBe(`丌${P(m3Hex)}官`);
  });

  test("paren-unwrap (han2edu test_注音括號提掉)", () => {
    expect(normalizeTaigi(`空(/孔)${P(h1)}(/${P(h2)})(訛變)。`, s))
      .toBe(`空(/孔)${P(h1)}/${P(h2)}(訛變)。`);
  });

  test("arrow completion one char (han2edu test_箭頭補一字)", () => {
    expect(normalizeTaigi(`是鹽${P(h1)}→${P(h2)}。`, s)).toBe(`是鹽${P(h1)}→鹽${P(h2)}。`);
  });

  test("arrow completion multi char (han2edu test_箭頭補多一字)", () => {
    const orig =
      `橄${P("95b0")}欖${P("93d2")}(字音)→橄${P("95ae")}欖${P("93d2")}→橄${P("94f7")}欖${P("92d5")}(語音)。台灣市面所見多是鹽${P("875e")}→${P("9667")}橄${P("95b0")}→${P("94f7")}欖${P("93d2")}→${P("92d5")}，`;
    const ans =
      `橄${P("95b0")}欖${P("93d2")}(字音)→橄${P("95ae")}欖${P("93d2")}→橄${P("94f7")}欖${P("92d5")}(語音)。台灣市面所見多是鹽${P("875e")}→鹽${P("9667")}橄${P("95b0")}→橄${P("94f7")}欖${P("93d2")}→欖${P("92d5")}，`;
    expect(normalizeTaigi(orig, s)).toBe(ans);
  });

  test("arrow completion three chars (han2edu test_箭頭補三字)", () => {
    const orig = `胳${P("9560")}下${P("8656")}空(/孔)${P("99b0")}→${P("96da")}${P("9cc0")}${P("93e5")}。`;
    const ans = `胳${P("9560")}下${P("8656")}空(/孔)${P("99b0")}→胳${P("96da")}下${P("9cc0")}空(/孔)${P("93e5")}。`;
    expect(normalizeTaigi(orig, s)).toBe(ans);
  });

  test("combined arrow and paren unwrap (han2edu test_綜合)", () => {
    const orig =
      `胳${P("9560")}下${P("8656")}空(/孔)${P("99b0")}→${P("96da")}${P("9cc0")}${P("93e5")}(/${P("99b0")})(訛變)。`;
    const ans =
      `胳${P("9560")}下${P("8656")}空(/孔)${P("99b0")}→胳${P("96da")}下${P("9cc0")}空(/孔)${P("93e5")}/${P("99b0")}(訛變)。`;
    expect(normalizeTaigi(orig, s)).toBe(ans);
  });

  test("combined arrow and k-tag swap (han2edu test_綜合箭頭佮換注音)", () => {
    const orig =
      `橄${P("95b0")}欖${P("93d2")}(字音)→橄${P("95ae")}欖${P("93d2")}→橄${P("94f7")}欖${P("92d5")}(語音)。台灣市面所見多是鹽${P("875e")}→${P("9667")}橄${P("95b0")}→${P("94f7")}欖${P("93d2")}→${P("92d5")}，音諧：鹹${P("9667")}矸${P("95bc")}仔<k>${P("8d41")}</k>/${P("92d5")}。`;
    const ans =
      `橄${P("95b0")}欖${P("93d2")}(字音)→橄${P("95ae")}欖${P("93d2")}→橄${P("94f7")}欖${P("92d5")}(語音)。台灣市面所見多是鹽${P("875e")}→鹽${P("9667")}橄${P("95b0")}→橄${P("94f7")}欖${P("93d2")}→欖${P("92d5")}，音諧：鹹${P("9667")}矸${P("95bc")}仔${P("85d9")}/${P("92d5")}。`;
    expect(normalizeTaigi(orig, s)).toBe(ans);
  });

  test("no-op line stays identical (han2edu test_無變)", () => {
    const x = `手${P(h1)}後${P(h2)}曲${P(h1)}。靪${P(h1)}/${P(h2)}(/臼${P(h1)})(廈門)。`;
    expect(normalizeTaigi(x, s)).toBe(x);
  });
});