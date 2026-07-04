import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import pug from "pug";
import { txtTextToPugBody } from "../lib/dic/txt2pug.ts";

const volumePageSource = readFileSync("src/pages/[volume].astro", "utf8");
const indexPageSource = readFileSync("src/pages/index.astro", "utf8");

describe("dictionary render contracts", () => {
  test("volume ranges use wave dash between bopomofo syllables", () => {
    expect(volumePageSource).toContain("${sections[0].syllable}～${sections[sections.length - 1].syllable}");
    expect(volumePageSource).not.toContain("${sections[0].syllable}—${sections[sections.length - 1].syllable}");
    expect(indexPageSource).toContain("{v.first}～{v.last}");
    expect(indexPageSource).not.toContain("{v.first}—{v.last}");
  });

  test("plain-text appendix conversion preserves leading table spaces", () => {
    const pugSource = txtTextToPugBody("  ㄅ     1    ㄉ   365\n", process.cwd());
    const html = pug.render(pugSource);

    expect(html).toContain("  ㄅ     1    ㄉ   365");
    expect(html).not.toContain("|   ㄅ");
  });
});
