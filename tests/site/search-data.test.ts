import { describe, expect, test } from "bun:test";
import { getCorpus } from "../../lib/site/corpus.ts";
import {
  buildFulltextDocs,
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
    "han empty sinogram uses □ and head zhuyin",
    () => {
      const rows = buildSuggestRows(getCorpus(root));
      const blank = rows.find((r) => r[2] === "01" && r[3] === 309 && r[4] === 1);
      expect(blank).toBeDefined();
      expect(blank![0]).toBe("□");
      expect(blank![1]).toBe("ㄅㆤ");
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
    "fulltext doc for 八 contains fanqie gloss and ㄅㄚㆵ",
    () => {
      const docs = buildFulltextDocs(getCorpus(root));
      const ba = docs.find((d) => d.t === "八" && d.v === "01" && d.k === 1);
      expect(ba).toBeDefined();
      expect(ba!.d).toContain("布拔切");
      expect(ba!.d).toContain("ㄅㄚㆵ");
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