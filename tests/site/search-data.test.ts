import { describe, expect, test } from "bun:test";
import { getCorpus } from "../../lib/site/corpus.ts";
import {
  buildFulltextDocs,
  buildFulltextRows,
  buildSuggestRows,
  stripHeadwordMarkup,
} from "../../lib/site/search-data.ts";

const root = process.cwd();

describe("search-data", () => {
  test(
    "suggest row count equals words plus sinograms",
    () => {
      const corpus = getCorpus(root);
      let words = 0;
      let sinograms = 0;
      for (const r of corpus.volumes.values()) {
        words += r.words.length;
        sinograms += r.sinograms.length;
      }
      const rows = buildSuggestRows(corpus);
      expect(rows.length).toBe(words + sinograms);
    },
    30_000,
  );

  test(
    "喇叭 yields rows for vol 01 line 182 and vol 08 line 277",
    () => {
      const rows = buildSuggestRows(getCorpus(root));
      const laba = rows.filter((r) => r[0] === "喇叭");
      expect(laba).toContainEqual(["喇叭", expect.any(String), "01", 182, 0, expect.any(Number)]);
      expect(laba).toContainEqual(["喇叭", expect.any(String), "08", 277, 0, expect.any(Number)]);
    },
    30_000,
  );

  test(
    "bitmap PUA sinogram head is searchable as its mapped glyph",
    () => {
      const rows = buildSuggestRows(getCorpus(root));
      const ba = rows.find((r) => r[2] === "01" && r[3] === 309 && r[4] === 1);
      expect(ba).toBeDefined();
      expect(ba![0]).toBe("巴");
      expect(ba![1]).toBe("ㄅㆤ");
    },
    30_000,
  );

  test("stripHeadwordMarkup removes k tags", () => {
    expect(stripHeadwordMarkup("a<k>x</k>b")).toBe("axb");
  });

  test(
    "suggest strips k tags from word headwords",
    () => {
      const corpus = getCorpus(root);
      const withK = [...corpus.volumes.values()]
        .flatMap((r) => r.words)
        .find((w) => w.headword.includes("<k>"));
      expect(withK).toBeDefined();
      const rows = buildSuggestRows(corpus);
      const row = rows.find(
        (r) => r[2] === withK!.volume && r[3] === withK!.line && r[4] === 0,
      );
      expect(row).toBeDefined();
      expect(row![0]).toBe(stripHeadwordMarkup(withK!.headword));
      expect(row![0]).not.toContain("<k>");
    },
    30_000,
  );

  test(
    "word headword drops reading PUA after a k-tagged glyph",
    () => {
      const corpus = getCorpus(root);
      const word = corpus.volumes.get("06")?.words.find((w) => w.line === 228);
      expect(word).toBeDefined();
      expect(word!.headword).toBe("<k>溚</k>");

      const rows = buildSuggestRows(corpus);
      const row = rows.find((r) => r[2] === "06" && r[3] === 228 && r[4] === 0);
      expect(row).toBeDefined();
      expect(row![0]).toBe("溚");
      expect(row![0]).not.toContain(">");
    },
    30_000,
  );

  test(
    "fulltext doc for 八 contains fanqie gloss and ㄅㄚㆵ",
    () => {
      const docs = buildFulltextDocs(getCorpus(root));
      const ba = docs.find((d) => d.t === "八" && d.v === "01" && d.l === 9 && d.k === 1);
      expect(ba).toBeDefined();
      expect(ba!.d).toContain("布拔切");
      expect(ba!.d).toContain("ㄅㄚㆵ");
    },
    30_000,
  );

  test(
    "fulltext text strips split k-tag fragments from 癱瘓 gloss",
    () => {
      const docs = buildFulltextDocs(getCorpus(root));
      const doc = docs.find((d) => d.t === "癱瘓" && d.v === "06" && d.l === 2442 && d.k === 0);
      expect(doc).toBeDefined();
      expect(doc!.d).toContain("半 身 不 遂 𤻄");
      expect(doc!.d).not.toContain("遂 k 𤻄");
      expect(doc!.d).not.toContain("k>");
      expect(doc!.d).not.toContain("</k>");
    },
    30_000,
  );

  test(
    "compact fulltext rows preserve sinogram readings and stay under 9MiB",
    () => {
      const rows = buildFulltextRows(getCorpus(root));
      const ba = rows.find((r) => r[0] === "八" && r[1] === "01" && r[2] === 9 && r[3] === 1);
      expect(ba).toBeDefined();
      expect(ba![4]).toContain("布拔切");
      expect(ba![4]).toContain("ㄅㄚㆵ");
      expect(Buffer.byteLength(JSON.stringify(rows))).toBeLessThanOrEqual(9 * 1024 * 1024);
    },
    30_000,
  );

  test(
    "suggest rows sorted by t length then volume then line",
    () => {
      const rows = buildSuggestRows(getCorpus(root));
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1]!;
        const b = rows[i]!;
        const ta = a[0].length;
        const tb = b[0].length;
        if (ta !== tb) {
          expect(ta).toBeLessThanOrEqual(tb);
          continue;
        }
        if (a[2] !== b[2]) {
          expect(a[2].localeCompare(b[2])).toBeLessThanOrEqual(0);
          continue;
        }
        expect(a[3]).toBeLessThanOrEqual(b[3]);
      }
    },
    30_000,
  );
});