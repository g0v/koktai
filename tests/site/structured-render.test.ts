import { describe, expect, test } from "bun:test";
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
});