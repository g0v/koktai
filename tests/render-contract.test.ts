import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import pug from "pug";
import { txtTextToPugBody } from "../lib/dic/txt2pug.ts";

const volumePageSource = readFileSync("src/pages/[volume].astro", "utf8");
const indexPageSource = readFileSync("src/pages/index.astro", "utf8");
const siteCssSource = readFileSync("src/styles/site.css", "utf8");

describe("dictionary render contracts", () => {
  test("volume ranges use wave dash between bopomofo syllables", () => {
    expect(volumePageSource).toContain("${railSections[0]!.syllable}～${railSections[railSections.length - 1]!.syllable}");
    expect(volumePageSource).not.toContain("${railSections[0]!.syllable}—${railSections[railSections.length - 1]!.syllable}");
    expect(indexPageSource).toContain("{v.first}～{v.last}");
    expect(indexPageSource).not.toContain("{v.first}—{v.last}");
  });

  test("plain-text appendix conversion preserves leading table spaces", () => {
    const pugSource = txtTextToPugBody("  ㄅ     1    ㄉ   365\n", process.cwd());
    const html = pug.render(pugSource);

    expect(html).toContain("  ㄅ     1    ㄉ   365");
    expect(html).not.toContain("|   ㄅ");
  });

  test("ruby annotations stay above base characters unless standalone", () => {
    expect(siteCssSource).toContain("ruby:not(.zhuyin)");
    expect(siteCssSource).not.toContain("rt {\n  font-family: \"Iansui\", var(--font-ui);\n  font-size: 0.55em;\n  line-height: 1;\n  color: color-mix(in srgb, var(--ink) 76%, transparent);\n  letter-spacing: -0.01em;\n  vertical-align: middle;\n}");
    expect(siteCssSource).toContain("ruby.zhuyin-standalone");
  });
});
