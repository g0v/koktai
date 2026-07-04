// tests/extract/tei.test.ts
import { describe, expect, test } from "bun:test";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { buildTei } from "../../scripts/export-tei.ts";
import { extractVolume } from "../../lib/extract/extract.ts";

describe("TEI export", () => {
  const xml = buildTei([extractVolume(process.cwd(), "01").sinograms[0]!]);
  test("well-formed", () => {
    expect(XMLValidator.validate(xml)).toBe(true);
  });
  test("八 readings serialize with usg", () => {
    const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
    expect(xml).toContain('<etym type="fanqie">布拔切，黠韻</etym>');
    expect(xml).toContain('<usg type="geographic">漳</usg>');
    expect(doc).toBeTruthy();
  });
});