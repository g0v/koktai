import { describe, expect, test } from "bun:test";
import iconv from "iconv-lite";
import {
  cp950TableCodePoint,
  decodeCp950Astral,
  isCp950TrailByte,
  isCp950UserDefinedPair,
} from "../../lib/dic/cp950.ts";
import { CP950_PAIR_COUNT } from "../../lib/dic/cp950-table.ts";

describe("cp950 table vs iconv-lite (non-UDA pairs)", () => {
  test("pair count matches generator", () => {
    expect(CP950_PAIR_COUNT).toBeGreaterThan(13_000);
  });

  test("every non-UDA valid-trail pair matches iconv.decode", () => {
    let checked = 0;
    for (let lead = 0x81; lead <= 0xfe; lead++) {
      for (let trail = 0; trail < 256; trail++) {
        if (!isCp950TrailByte(trail)) continue;
        if (isCp950UserDefinedPair(lead, trail)) continue;
        const buf = Buffer.from([lead, trail]);
        const s = iconv.decode(buf, "cp950");
        const iconvCp = s.length === 1 ? s.codePointAt(0)! : 0;
        const tableCp = cp950TableCodePoint(lead, trail);
        expect(tableCp).toBe(iconvCp);
        if (iconvCp !== 0) {
          expect(decodeCp950Astral(buf)).toBe(s);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10_000);
  });

  test("Big5 ideographic space A1 40 → U+3000", () => {
    expect(decodeCp950Astral(Buffer.from([0xa1, 0x40]))).toBe("\u3000");
  });
});