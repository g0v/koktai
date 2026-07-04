import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getCorpus } from "../../lib/site/corpus.ts";
import { getStructuredVolume } from "../../lib/site/structured-volume.ts";
import type { StructuredToken } from "../../lib/site/structured-volume.ts";
import {
  renderLegacyText,
  renderSinogramEntry,
  renderStructuredEntry,
  renderStructuredVolumeBody,
} from "../../lib/site/structured-render.ts";

const root = process.cwd();

function entryGerRen() {
  const vol = getStructuredVolume(root, "09");
  for (const section of vol.sections) {
    const entry = section.entries.find((e) => e.headword === "個人");
    if (entry) return { vol, section, entry };
  }
  throw new Error("【個人】 not found in volume 09");
}

describe("structured dictionary render", () => {
  test("【個人】 entry HTML exposes 我 readings and semantic classes", () => {
    const { entry } = entryGerRen();
    const html = renderStructuredEntry(entry);

    expect(html).toContain("我");
    expect(html).toContain("ㄫㆦˋ");
    expect(html).toContain("ㆣㄨㄚˋ");
    expect(html).toContain("文");
    expect(html).toContain("語");
    expect(html).toContain("entry-card");
    expect(html).toContain("token-ruby");
    expect(html).toContain("usage-register");
    expect(html).toContain("lane-mandarin");
    expect(html).toContain("lane-taigi");
    expect(html).toContain("entry-spine");
    expect(html).toContain("sense-grid");
    expect(html).toContain("reading-zhuyin");
  });

  test("renderSinogramEntry 八 vol 01 shows fanqie and reading chips", () => {
    const vol = getStructuredVolume(root, "01");
    const sec = vol.sections.find((s) => s.sinograms.some((g) => g.han === "八"));
    const eight = sec!.sinograms.find((g) => g.han === "八")!;
    const html = renderSinogramEntry(eight);
    expect(html).toContain('id="c-');
    expect(html).toContain("布拔切");
    expect(html).toContain("char-card");
    expect(html).toContain("reading-chip");
  });

  test("renderSinogramEntry han empty uses □ head", () => {
    const vol = getStructuredVolume(root, "01");
    const blank = vol.sections.flatMap((s) => s.sinograms).find((g) => g.han === "");
    expect(blank).toBeDefined();
    const html = renderSinogramEntry(blank!);
    expect(html).toContain("□");
  });

  test("with ctx, sinogram header and reading lines do not produce kk hover links", () => {
    const corpus = getCorpus(root);
    const ctx = { resolver: corpus.resolver, hrefBase: "/koktai/" };
    const vol = getStructuredVolume(root, "01");
    const eight = vol.sections.flatMap((s) => s.sinograms).find((g) => g.han === "八");
    expect(eight).toBeDefined();
    const html = renderSinogramEntry(eight!, {
      ...ctx,
      self: { k: "c", v: eight!.volume, l: eight!.line },
    });
    const head = html.match(/<h3 class="char-head">([\s\S]*?)<\/h3>/)?.[1] ?? "";
    const readingLines = html.match(/<dl class="reading-lines">([\s\S]*?)<\/dl>/)?.[1] ?? "";
    expect(head).not.toContain('class="kk"');
    expect(head).not.toContain("data-kk=");
    expect(readingLines).not.toContain('class="kk"');
    expect(readingLines).not.toContain("data-kk=");
  });

  test("with ctx, entry contains a.kk cross-volume href", () => {
    const corpus = getCorpus(root);
    const ctx = { resolver: corpus.resolver, hrefBase: "/koktai/" };
    const vol = getStructuredVolume(root, "01");
    const entry = vol.sections.flatMap((s) => s.entries).find((e) => e.line === 25);
    expect(entry).toBeDefined();
    const html = renderStructuredEntry(entry!, { ...ctx, self: { v: "01", l: entry!.line } });
    expect(html).toContain('class="kk"');
    expect(html).toMatch(/lane-mandarin">[^<]*<a class="kk" href="[^"]+\.html#w-/);
  });

  test("renderStructuredEntry without ctx matches prior output shape", () => {
    const { entry } = entryGerRen();
    const html = renderStructuredEntry(entry);
    expect(html).toContain('id="w-');
    expect(html).not.toContain('class="kk"');
    expect(html).toContain("entry-card");
    expect(html).toContain("【");
    expect(html).toContain("個");
    expect(html).toContain("人");
    expect(html).toContain("entry-spine");
  });

  test("renderStructuredToken generates variant-chip and usage-geo", () => {
    const token = {
      kind: "variant",
      alternatives: [[{ kind: "prose", text: "A" }]],
      usages: { register: [], geo: ["漳"], other: [] },
      text: "A",
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);
    expect(html).toContain("variant-chip");
    expect(html).toContain("usage-geo");
  });

  test("structured renderer converts bare legacy PUA glyphs in han tokens", () => {
    const pua = String.fromCodePoint(0xf8d44);
    const token = { kind: "syl", han: pua, readings: [] } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);

    expect(html).toContain('class="token-han"');
    expect(html).not.toContain(pua);
    expect(html).toContain("ㄗㄨㄥ");
  });

  test("legacy text consumes k tags and emits horizontal zhuyin ruby", () => {
    const kai = String.fromCodePoint(0xf8d44);
    const horizontalI = String.fromCodePoint(0xf8265);
    const html = renderLegacyText(`祀<k>${kai}</k>人${horizontalI}`);

    expect(html).not.toContain("&lt;k&gt;");
    expect(html).not.toContain("&lt;/k&gt;");
    expect(html).toContain('<ruby class="zhuyin">');
    expect(html).toContain("<rt>ㄗㄨㄧ</rt>");
    expect(html).not.toContain("ㄗㄨ丨");
  });

  test("site.css defines char-card and src-badge and aligns outside ruby", () => {
    const css = readFileSync("src/styles/site.css", "utf8");
    expect(css).toContain(".char-card");
    expect(css).toContain(".src-badge");
    expect(css).toMatch(/ruby:not\(\.zhuyin\),\s*ruby\.zhuyin-standalone\s*\{[^}]*vertical-align:\s*middle;/s);
    expect(css).not.toContain("ruby.zhuyin:has(> rt:only-child)");
    expect(css).not.toMatch(/rt\s*\{[^}]*vertical-align:\s*middle;/s);
  });

  test("standalone zhuyin fragments get an explicit class", () => {
    const html = renderLegacyText("<rt>ㄧ</rt>");

    expect(html).toBe('<ruby class="zhuyin zhuyin-standalone"><rt>ㄧ</rt></ruby>');
  });

  test("syllable tokens render readings as ruby annotations over linked han", () => {
    const token = {
      kind: "syl",
      han: "一嘴",
      readings: [{ zhuyin: "ㄆㄨㄧ˪", register: [], geo: [], other: [] }],
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);

    expect(html).toContain('<ruby class="token-ruby zhuyin">');
    expect(html).toContain('<span class="token-han">一嘴</span>');
    expect(html).toContain('<rt><span class="reading-zhuyin">ㄆㄨㄧ˪</span></rt>');
    expect(html).not.toContain('<span class="token-han">一嘴</span><span class="reading-chip">');
  });

  test("structured volume body uses structured-doc and section anchors", () => {
    const vol = getStructuredVolume(root, "09");
    const pugSections = vol.sections.map((s, i) => ({
      syllable: s.chapterZhuyin,
      roman: "",
      note: "",
      id: `s-${i + 1}`,
    }));
    const html = renderStructuredVolumeBody(vol, pugSections);

    expect(html).toContain('class="structured-doc"');
    expect(html).toContain('id="s-1"');
    expect(html).toContain('class="syl"');
    expect(html).not.toContain("set:html");
  });

  test("[volume].astro uses string renderer instead of StructuredEntry", () => {
    const src = readFileSync("src/pages/[volume].astro", "utf8");
    expect(src).not.toContain("StructuredEntry");
    expect(src).toContain("renderStructuredSection");
  });
});
