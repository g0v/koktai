import { describe, expect, test } from "bun:test";
import { normalizeReadingNote } from "../../lib/extract/sinogram.ts";
import { extractVolume } from "../../lib/extract/extract.ts";

describe("normalizeReadingNote", () => {
  test("strips bare trailing 按：", () => {
    expect(normalizeReadingNote("。按：")).toBeNull();
    expect(normalizeReadingNote("  。按： ")).toBeNull();
  });

  test("keeps substantive 按： annotations", () => {
    expect(normalizeReadingNote("按：疑語源為「桲」。")).toBe("按：疑語源為「桲」。");
    expect(normalizeReadingNote("併「櫃」入【柜】。按：台語另作")).toBe(
      "併「櫃」入【柜】。按：台語另作",
    );
  });
});

describe("extractVolume 16 ㄓㄤ cluster", () => {
  const r = extractVolume(process.cwd(), "16");

  test("台甘 lines for 章/張 no longer end with lone 按：", () => {
    const heads = new Set(["章", "張", "彰", "漳", "樟"]);
    for (const e of r.sinograms) {
      if (!heads.has(e.han)) continue;
      for (const l of e.readingLines) {
        if (l.source !== "台甘") continue;
        expect(l.note).not.toBe("。按：");
        expect(l.note?.endsWith("按：")).not.toBe(true);
      }
    }
  });

  test("parsed lines still satisfy note-or-parsed contract", () => {
    for (const e of r.sinograms) {
      for (const l of e.readingLines) {
        const hasNote = (l.note ?? "").length > 0;
        expect(l.parsed || hasNote || l.readings.length > 0).toBe(true);
      }
    }
  });
});