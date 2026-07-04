// tests/extract/tei.test.ts
import { describe, expect, test } from "bun:test";
import { buildTei } from "../../scripts/export-tei.ts";
import { extractVolume } from "../../lib/extract/extract.ts";

function assertWellFormedXml(xml: string): void {
  const stack: string[] = [];
  const tags = xml.matchAll(/<[^!?][^>]*\/>|<([^!?/][^>\s/]*)(?:\s[^>]*)?>|<\/([^>\s]+)>/g);

  for (const match of tags) {
    const [, open, close] = match;
    if (open) {
      stack.push(open);
      continue;
    }

    if (close) {
      expect(stack.pop()).toBe(close);
    }
  }

  expect(stack).toEqual([]);
}

describe("TEI export", () => {
  const xml = buildTei([extractVolume(process.cwd(), "01").sinograms[0]!]);
  test("well-formed", () => {
    assertWellFormedXml(xml);
  });
  test("八 readings serialize with usg", () => {
    expect(xml).toContain('<etym type="fanqie">布拔切，黠韻</etym>');
    expect(xml).toContain('<usg type="geographic">漳</usg>');
  });
});