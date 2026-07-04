// tests/extract/sinogram.test.ts
import { describe, expect, test } from "bun:test";
import { recodeDicFile } from "../../lib/dic/cp950.ts";
import { splitVolume } from "../../lib/extract/blocks.ts";
import { loadSyllables } from "../../lib/extract/syllables.ts";
import { parseSinogram } from "../../lib/extract/sinogram.ts";

const s = loadSyllables(process.cwd());
const v01 = splitVolume(recodeDicFile("beta01k.dic"));
const ba = parseSinogram(v01.sinograms[0]!, "01", "ㄅㄚ", s);

describe("sinogram block 八 (beta01k.dic line 9)", () => {
  test("head", () => {
    expect(ba.han).toBe("八");
    expect(ba.headZhuyin).toBe("ㄅㄚ");
    expect(ba.fanqie).toBe("布拔切，黠韻");
  });
  test("台甘 line: nested register/geo semantics", () => {
    const tg = ba.readingLines.find((r) => r.source === "台甘")!;
    expect(tg.line).toBeGreaterThan(0);
    expect(tg.parsed).toBe(true);
    expect(tg.readings).toEqual([
      { zhuyin: "ㄅㄚㆵ", usages: [{ dim: "register", value: "文" }] },
      { zhuyin: "ㄅㆤㆷ", usages: [{ dim: "register", value: "語" }, { dim: "geo", value: "漳" }] },
      {
        zhuyin: "ㄅㄨㆤㆷ",
        usages: [
          { dim: "register", value: "語" },
          { dim: "geo", value: "廈" },
          { dim: "geo", value: "泉" },
        ],
      },
    ]);
  });
  test("普閩 line", () => {
    const pm = ba.readingLines.find((r) => r.source === "普閩")!;
    expect(pm.readings).toEqual([
      { zhuyin: "ㄅㄚㆵ", usages: [{ dim: "register", value: "文" }] },
      { zhuyin: "ㄅㄨㆤㆷ", usages: [{ dim: "register", value: "白" }] },
    ]);
  });
  test("國音 line falls back to note without losing text", () => {
    const gy = ba.readingLines.find((r) => r.source === "國音")!;
    expect(gy.raw).toContain("~fm7;國音");
    expect((gy.note ?? "") + gy.readings.map((r) => r.zhuyin).join("")).toContain("下一字為去聲");
  });
});

describe("shape fixtures", () => {
  // beta01k.dic line 51: bare single reading `ㄅㄚ∥`  (shape Rx)
  // beta01k.dic line 281: `ㄅㄚ(罕用)∥`               (shape RLx)
  const block51 = v01.sinograms.find((b) => b.readingLines.some((r) => r.line === 51));
  const block281 = v01.sinograms.find((b) => b.readingLines.some((r) => r.line === 281));
  test("Rx: unlabeled reading", () => {
    expect(block51, "fixture: sinogram block with reading line 51").toBeDefined();
    const e = parseSinogram(block51!, "01", "ㄅㄚ", s);
    const tg = e.readingLines.find((x) => x.source === "台甘")!;
    expect(tg.readings).toEqual([{ zhuyin: "ㄅㄚ", usages: [] }]);
  });
  test("RLx: suffix frequency label", () => {
    expect(block281, "fixture: sinogram block with reading line 281").toBeDefined();
    const e = parseSinogram(block281!, "01", "ㄅㄚ", s);
    const tg = e.readingLines.find((x) => x.source === "台甘")!;
    expect(tg.readings).toEqual([{ zhuyin: "ㄅㄚ", usages: [{ dim: "frequency", value: "罕用" }] }]);
  });
});