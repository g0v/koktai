import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { jadeUnescapeLine, loadFontMaps } from "../../lib/dic/unescape.ts";

const root = join(import.meta.dir, "../..");
const maps = loadFontMaps(root);

describe("expandM3 noruby before img", () => {
  test("UDA kana c7dc/c7ce/c7de render as text inside rt (Gum紐 gloss)", () => {
    const gum = String.fromCodePoint(0xfc7dc, 0xfc7ce, 0xfc7de);
    const line = `Gum紐(/ゴ${gum})，日語。`;
    const out = jadeUnescapeLine(line, maps);
    expect(out).toContain("ムヒモ");
    expect(out).not.toMatch(/img\/m3\/c7(d[cde]|ce|de)\.png/);
  });
});