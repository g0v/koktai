// tests/extract/extract.test.ts
import { describe, expect, test } from "bun:test";
import { extractVolume } from "../../lib/extract/extract.ts";

describe("extractVolume 01", () => {
  const r = extractVolume(process.cwd(), "01");
  test("counts are in the known ballpark", () => {
    expect(r.stats.sinograms).toBeGreaterThan(300);
    expect(r.stats.words).toBeGreaterThan(1500);
    expect(r.stats.roundtripFailures).toBe(0);
    expect(r.stats.structuredTokenCoverage).toBeGreaterThan(0.55);
  });
  test("台甘/普閩 parse coverage ≥ 90%", () => {
    for (const src of ["台甘", "普閩"]) {
      const { total, parsed } = r.stats.readingLineBySource[src]!;
      expect(parsed / total).toBeGreaterThanOrEqual(0.9);
    }
  });
  test("nothing vanished: every reading line is parsed or noted", () => {
    for (const e of r.sinograms) {
      for (const l of e.readingLines) {
        expect(l.parsed || (l.note ?? "").length > 0).toBe(true);
      }
    }
  });
  test("consecutive same headword merges senses", () => {
    const eight = r.words.find((w) => w.headword === "八");
    expect(eight, "【八】 merged record").toBeDefined();
    expect(eight!.senses.length).toBeGreaterThanOrEqual(3);
    const nhs = eight!.senses.map((s) => s.nh);
    expect(new Set(nhs).size).toBe(nhs.length);
  });
});