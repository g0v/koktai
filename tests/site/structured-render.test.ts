import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getStructuredVolume } from "../../lib/site/structured-volume.ts";
import {
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
    expect(html).toContain("reading-chip");
    expect(html).toContain("usage-register");
    expect(html).toContain("lane-mandarin");
    expect(html).toContain("lane-taigi");
    expect(html).toContain("entry-spine");
    expect(html).toContain("sense-grid");
    expect(html).toContain("reading-zhuyin");
  });

  test("renderStructuredEntry without ctx matches prior output shape", () => {
    const { entry } = entryGerRen();
    const html = renderStructuredEntry(entry);
    expect(html).not.toMatch(/\bid="/);
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
      usages: { register: [], geo: ["漳"], other: [] }
    } as any;
    const html = require("../../lib/site/structured-render.ts").renderStructuredToken(token);
    expect(html).toContain("variant-chip");
    expect(html).toContain("usage-geo");
  });

  test("outside ruby fragments align with surrounding prose", () => {
    const css = readFileSync("src/styles/site.css", "utf8");
    expect(css).toMatch(/ruby:not\(\.zhuyin\)\s*\{[^}]*vertical-align:\s*middle;/s);
    expect(css).toMatch(/rt\s*\{[^}]*vertical-align:\s*middle;/s);
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