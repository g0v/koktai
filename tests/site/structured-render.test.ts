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
import type { RenderCtx } from "../../lib/site/linkify.ts";
import { entryLinkFromSection } from "../../lib/site/volume-paths.ts";

const root = process.cwd();
function renderCtx(
  corpus: ReturnType<typeof getCorpus>,
  fromVol: string,
  fromSection: number,
): RenderCtx {
  return { resolver: corpus.resolver, fromVol, fromSection, corpus };
}

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
    const sec = vol.sections.find((s) => s.sinograms.some((g) => g.han === "八" && g.line === 9));
    const eight = sec!.sinograms.find((g) => g.han === "八" && g.line === 9)!;
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
    const vol = getStructuredVolume(root, "01");
    const eight = vol.sections.flatMap((s) => s.sinograms).find((g) => g.han === "八");
    expect(eight).toBeDefined();
    const secIdx =
      vol.sections.findIndex((s) => s.sinograms.some((g) => g.han === "八")) + 1;
    const ctx = renderCtx(corpus, "01", secIdx);
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
    const vol = getStructuredVolume(root, "01");
    const entry = vol.sections.flatMap((s) => s.entries).find((e) => e.line === 25);
    expect(entry).toBeDefined();
    const secIdx =
      vol.sections.findIndex((s) => s.entries.some((e) => e.line === 25)) + 1;
    const ctx = renderCtx(corpus, "01", secIdx);
    const html = renderStructuredEntry(entry!, { ...ctx, self: { v: "01", l: entry!.line } });
    expect(html).toMatch(/lane-mandarin">[^<]*<a class="kk" href="(?:\.\.\/)*(?:0[1-9]|1[0-9]|2[0-6])\/\d+\/index\.html#w-/);
    expect(html).not.toMatch(/href="\/koktai\//);
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

  test("PUA syl base under structured readings does not nest ruby", () => {
    const pua = String.fromCodePoint(0xffca6);
    const token = {
      kind: "syl",
      han: pua,
      readings: [{ zhuyin: "ㆠㄨㆤ˫", register: [], geo: [], other: [] }],
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);

    expect(html).toContain('<ruby class="token-ruby zhuyin">');
    expect(html).toContain('<rt><span class="reading-zhuyin">ㆠㄨㆤ˫</span></rt>');
    expect(html).toContain("ㆠㆤ˫");
    expect(html).not.toContain(pua);
    expect(html).not.toMatch(/token-han">\s*<ruby/);
    expect(html).not.toContain("zhuyin-standalone");
  });

  test("k-tagged PUA syl base under structured readings does not nest ruby", () => {
    const pua = String.fromCodePoint(0xffadf);
    const token = {
      kind: "syl",
      han: `<k>${pua}</k>`,
      readings: [{ zhuyin: "ㄉㄤ˪", register: [], geo: [], other: [] }],
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);

    expect(html).toContain('<ruby class="token-ruby zhuyin">');
    expect(html).toContain('<rt><span class="reading-zhuyin">ㄉㄤ˪</span></rt>');
    // fadf is m3-only; inside <k> the kai path falls back to the k bitmap, not m3 reading text.
    expect(html).toContain("img/k/fadf.png");
    expect(html).not.toMatch(/token-han">\s*<ruby/);
    expect(html).not.toContain("zhuyin-standalone");
  });

  test("m3 reading base expands nested glyph PUA without residual astral", () => {
    // faca → ㄅ + fa62(ㄜ〾 image) + ㆷ̇
    const pua = String.fromCodePoint(0xffaca);
    const token = {
      kind: "syl",
      han: pua,
      readings: [{ zhuyin: "ㄇㄚ˫", register: [], geo: [], other: [] }],
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);

    expect(html).toContain("img/m3/fa62.png");
    expect(html).toContain("ㄅ");
    expect(html).toContain("ㆷ");
    expect(html).not.toMatch(/[\u{f0000}-\u{fffff}]/u);
    expect(html).not.toMatch(/token-han">\s*<ruby/);
  });

  test("ordinary Han syl bases stay linkable via renderCharLink", () => {
    const corpus = getCorpus(root);
    const ctx = renderCtx(corpus, "07", 28);
    const token = {
      kind: "syl",
      han: "蒜",
      readings: [{ zhuyin: "ㄙㄨㄢ˪", register: [], geo: [], other: [] }],
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token, ctx);

    expect(html).toContain('class="kk"');
    expect(html).toContain("蒜");
    expect(html).toContain("ㄙㄨㄢ˪");
    expect(html).not.toMatch(/token-han">\s*<ruby/);
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

  test("legacy text renders PUA fallback as bitmap image with page-relative img path", () => {
    const pua = String.fromCodePoint(0xfb000);
    const html = renderLegacyText(`<k>${pua}</k>`, "./");

    expect(html).toContain('src="./img/');
    expect(html).not.toContain(pua);
  });

  test("legacy text renders PUA fallback as bitmap image under relative base", () => {
    const pua = String.fromCodePoint(0xfb000);
    const html = renderLegacyText(`<k>${pua}</k>`, "./");

    expect(html).toContain('src="./img/');
    expect(html).not.toContain(pua);
  });

  test("linked legacy text consumes k tags before inserting dictionary links", () => {
    const corpus = getCorpus(root);
    const ctx = {
      ...renderCtx(corpus, "01", 1),
      resolver: {
        segment(text: string) {
          const target = { k: "c" as const, v: "08", l: 1758 };
          if (text === "<k>類語</k>：嘿") {
            return [{ text: "<k>" }, { text: "類", target }, { text: "語</k>：嘿" }];
          }
          return [{ text }];
        },
        char() {
          return undefined;
        },
        alternate() {
          return undefined;
        },
      },
    };
    const entry = {
      volume: "01",
      line: 1,
      headword: "x",
      head: [],
      senses: [
        {
          nh: "",
          pos: "None",
          mandarin: ["<k>類語</k>：嘿"],
          taigi: [],
        },
      ],
    };

    const html = renderStructuredEntry(entry, ctx);

    expect(html).not.toContain("<k>");
    expect(html).not.toContain("</k>");
  });

  test("legacy text strips raw PE2 control tags from prose", () => {
    const raw = "~fk;;~fm3;;食~fk;ㄆ~fm3;;~fk;;~fm3;;緊(等)煮較爛咧則(/即)即付汝~bt180;·~bt0;;食。枵鬼氐氐。";
    const html = renderLegacyText(raw, "./");

    expect(html).toContain("食");
    expect(html).toContain("枵鬼氐氐");
    expect(html).toContain("ㄆ");
    expect(html).not.toContain("~fk");
    expect(html).not.toContain("~fm3");
    expect(html).not.toContain("~bt");
    expect(html).not.toContain(";;");
    expect(html).not.toContain(";食");
    expect(html).not.toContain("·;");
  });

  test("site.css defines char-card and src-badge and aligns outside ruby", () => {
    const css = readFileSync("src/styles/site.css", "utf8");
    expect(css).toContain(".char-card");
    expect(css).toContain(".src-badge");
    expect(css).toMatch(/ruby:not\(\.zhuyin\),\s*ruby\.zhuyin-standalone\s*\{[^}]*vertical-align:\s*middle;/s);
    expect(css).not.toContain("ruby.zhuyin:has(> rt:only-child)");
    expect(css).not.toMatch(/(^|\n)rt\s*\{[^}]*vertical-align:\s*middle;/s);
  });

  test("site.css keeps structured token zhuyin in native ruby flow", () => {
    const css = readFileSync("src/styles/site.css", "utf8");
    expect(css).toMatch(/\.token-ruby\.zhuyin\s*\{[^}]*ruby-position:\s*over;[^}]*vertical-align:\s*baseline;/s);
    expect(css).toMatch(/\.token-ruby\.zhuyin\s*>\s*rt\s*\{[^}]*white-space:\s*nowrap;[^}]*text-align:\s*center;/s);
    expect(css).not.toMatch(/\.token-ruby\.zhuyin\s*>\s*rt\s*\{[^}]*position:\s*relative;/s);
    expect(css).not.toMatch(/\.token-ruby\.zhuyin\s*>\s*rt\s*\{[^}]*inset-block-start:/s);
    expect(css).not.toContain("reading-zhuyin-vert .bpmf-body");
    expect(css).not.toMatch(/\.token-ruby\.zhuyin[^}]*writing-mode:\s*vertical-rl/s);
  });

  test("site.css prevents variant solidus from wrapping away from its ruby", () => {
    const css = readFileSync("src/styles/site.css", "utf8");
    expect(css).toMatch(/\.variant-body\s*\{[^}]*white-space:\s*nowrap;/s);
  });

  test("site.css keeps entry headwords on one line", () => {
    const css = readFileSync("src/styles/site.css", "utf8");

    expect(css).toMatch(/\.structured-doc \.entry-spine\s*\{[^}]*white-space:\s*nowrap;/s);
    expect(css).toMatch(
      /\.structured-doc \.entry-spine\s*\{[^}]*font-family:\s*var\(--font-spine\);/s,
    );
    expect(css).toMatch(
      /\.structured-doc \.char-head\s*\{[^}]*font-family:\s*var\(--font-spine\);/s,
    );
  });

  test("standalone zhuyin fragments get an explicit class", () => {
    const html = renderLegacyText("<rt>ㄧ</rt>", "./");

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

  test("Mandarin tone marks stay inline in stacked horizontal ruby", () => {
    const token = {
      kind: "syl",
      han: "把",
      readings: [
        { zhuyin: "ㄅㄚˇ", register: [], geo: [], other: [] },
        { zhuyin: "ㄅㄚˉ", register: [], geo: [], other: [] },
      ],
    } satisfies StructuredToken;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);

    expect(html).toContain('<rt><span class="reading-zhuyin">ㄅㄚˇ</span><span class="reading-zhuyin">ㄅㄚˉ</span></rt>');
    expect(html).not.toContain("bpmf-body");
    expect(html).not.toContain("bpmf-tone");
    expect(html).not.toContain("reading-zhuyin-vert");
  });

  test("linked Mandarin legacy ruby keeps readings attached to base glyphs", () => {
    const corpus = getCorpus(root);
    const ctx = {
      ...renderCtx(corpus, "16", 1),
      resolver: {
        segment(text: string) {
          const target = { k: "c" as const, v: "10", l: 1434 };
          return text === "開" ? [{ text, target }] : [{ text }];
        },
        char() {
          return undefined;
        },
        alternate() {
          return undefined;
        },
      },
    };
    const entry = {
      volume: "16",
      line: 8482,
      headword: "開張",
      head: [],
      senses: [
        {
          nh: "",
          pos: "None",
          mandarin: ['<ruby>開<rt>&thinsp;ㄎㄞ&thinsp;</rt></ruby><ruby>張<rt>&thinsp;ㄉㄧㆲ/ㄉㄧㄤ&thinsp;</rt></ruby>。'],
          taigi: [],
        },
      ],
    };

    const html = renderStructuredEntry(entry, ctx);

    const kkHref = entryLinkFromSection("16", 1, { k: "c", v: "10", l: 1434 }, corpus);
    expect(html).toContain(`<ruby class="zhuyin"><a class="kk" href="${kkHref}" data-kk="c:10:1434">開</a><rt>&thinsp;ㄎㄞ&thinsp;</rt></ruby>`);
    expect(html).toContain('<ruby class="zhuyin">張<rt>&thinsp;ㄉㄧㆲ/ㄉㄧㄤ&thinsp;</rt></ruby>');
    expect(html).not.toContain(`<a class="kk" href="${kkHref}" data-kk="c:10:1434">開</a><ruby class="zhuyin zhuyin-standalone"><rt>ㄎㄞ</rt></ruby>`);
  });

  test("linked Mandarin bare rt ruby keeps reading attached to its base glyph", () => {
    const corpus = getCorpus(root);
    const ctx = {
      ...renderCtx(corpus, "16", 1),
      resolver: {
        segment(text: string) {
          const target = { k: "c" as const, v: "10", l: 1434 };
          return text === "開" ? [{ text, target }] : [{ text }];
        },
        char() {
          return undefined;
        },
        alternate() {
          return undefined;
        },
      },
    };
    const entry = {
      volume: "16",
      line: 8420,
      headword: "張",
      head: [],
      senses: [
        {
          nh: "",
          pos: "None",
          mandarin: ["按：開<rt>ㄎㄞ</rt>張"],
          taigi: [],
        },
      ],
    };

    const html = renderStructuredEntry(entry, ctx);

    const kkHref = entryLinkFromSection("16", 1, { k: "c", v: "10", l: 1434 }, getCorpus(root));
    expect(html).toContain(`<ruby class="zhuyin"><a class="kk" href="${kkHref}" data-kk="c:10:1434">開</a><rt>ㄎㄞ</rt></ruby>`);
    expect(html).not.toContain(`<a class="kk" href="${kkHref}" data-kk="c:10:1434">開</a><ruby class="zhuyin zhuyin-standalone"><rt>ㄎㄞ</rt></ruby>`);
  });

  test("solidus before linked legacy ruby stays glued to the ruby base", () => {
    const corpus = getCorpus(root);
    const ctx = {
      ...renderCtx(corpus, "16", 1),
      resolver: {
        segment(text: string) {
          const target = { k: "c" as const, v: "05", l: 100 };
          return text === "從" ? [{ text, target }] : [{ text }];
        },
        char() {
          return undefined;
        },
        alternate() {
          return undefined;
        },
      },
    };
    const entry = {
      volume: "16",
      line: 19175,
      headword: "張",
      head: [],
      senses: [
        {
          nh: "",
          pos: "None",
          mandarin: ['<ruby>自<rt>&thinsp;ㄗㄨ˫&thinsp;</rt></ruby>(/<ruby>從<rt>&thinsp;ㄐ丨ㄥ˫&thinsp;</rt></ruby>)'],
          taigi: [],
        },
      ],
    };

    const html = renderStructuredEntry(entry, ctx);

    const kkHref = entryLinkFromSection("16", 1, { k: "c", v: "05", l: 100 }, getCorpus(root));
    expect(html).toContain(`(/\u2060<ruby class="zhuyin"><a class="kk" href="${kkHref}" data-kk="c:05:100">從</a><rt>&thinsp;ㄐ丨ㄥ˫&thinsp;</rt></ruby>)`);
    expect(html).not.toContain('(/<ruby class="zhuyin"><a class="kk"');
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

  test("section route embeds pre-rendered snapshot", () => {
    const src = readFileSync("src/pages/[volume]/[section]/index.astro", "utf8");
    expect(src).not.toContain("StructuredEntry");
    expect(src).toContain("section:snapshots");
    expect(src).toContain("sectionHtml");
  });
});
