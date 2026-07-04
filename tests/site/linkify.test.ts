import { describe, expect, test } from "bun:test";
import {
  buildResolver,
  normalizeHeadwordKey,
  type LinkResolver,
} from "../../lib/site/linkify.ts";
import { getCorpus } from "../../lib/site/corpus.ts";

function miniResolver(): LinkResolver {
  return buildResolver({
    volumes: new Map([
      [
        "01",
        {
          words: [
            { headword: "八卦", volume: "01", line: 100 },
            { headword: "巴結·", volume: "02", line: 50 },
            { headword: "<k>秘</k>書", volume: "03", line: 10 },
          ],
          sinograms: [{ han: "八", volume: "01", line: 5 }],
        },
      ],
      [
        "08",
        {
          words: [
            { headword: "八卦", volume: "08", line: 200 },
            { headword: "喇叭", volume: "08", line: 277 },
          ],
          sinograms: [],
        },
      ],
    ]),
  });
}

describe("normalizeHeadwordKey", () => {
  test("strips k tags and trailing middle dot", () => {
    expect(normalizeHeadwordKey("巴結·")).toBe("巴結");
    expect(normalizeHeadwordKey("<k>秘</k>書")).toBe("秘書");
  });
});

describe("buildResolver segment", () => {
  test("八卦 maximal munch prefers word over char fallback", () => {
    const r = miniResolver();
    const segs = r.segment("易經八卦之一");
    const linked = segs.filter((s) => s.target);
    expect(linked.some((s) => s.text === "八卦" && s.target!.k === "w")).toBe(true);
    const idx = segs.findIndex((s) => s.text === "八卦");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(segs[idx]!.target).toEqual({ k: "w", v: "01", l: 100 });
  });

  test("巴結· key matches prose 巴結", () => {
    const r = miniResolver();
    const segs = r.segment("拍馬屁，巴結。");
    expect(segs.some((s) => s.text === "巴結" && s.target?.v === "02")).toBe(true);
  });

  test("headwords with k markup are not trie keys", () => {
    const r = miniResolver();
    const segs = r.segment("秘書工作");
    expect(segs.every((s) => !(s.text === "秘書" && s.target))).toBe(true);
  });

  test("char fallback links isolated han", () => {
    const r = miniResolver();
    const segs = r.segment("見八");
    expect(segs.some((s) => s.text === "八" && s.target?.k === "c")).toBe(true);
  });

  test("tilde is plain text", () => {
    const r = miniResolver();
    const segs = r.segment("八～卦");
    expect(segs.some((s) => s.text.includes("～") && !s.target)).toBe(true);
  });
});

describe("buildResolver alternate", () => {
  test("alternate returns other volume for same headword", () => {
    const r = miniResolver();
    const t = { k: "w" as const, v: "01", l: 100 };
    expect(r.alternate(t)).toEqual({ k: "w", v: "08", l: 200 });
  });
});

describe("segment safety", () => {
  test("plain text with angle brackets stays unlinked", () => {
    const r = miniResolver();
    const segs = r.segment("a<b>c");
    expect(segs).toEqual([{ text: "a<b>c" }]);
  });
});

describe("corpus resolver", () => {
  test("getCorpus resolver segments 喇叭 from full index", () => {
    const c = getCorpus(process.cwd());
    const segs = c.resolver.segment("大聲喇叭");
    expect(segs.some((s) => s.text === "喇叭" && s.target?.k === "w")).toBe(true);
  });
});