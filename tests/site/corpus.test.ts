// tests/site/corpus.test.ts
import { describe, expect, test } from "bun:test";
import { getCorpus } from "../../lib/site/corpus.ts";

const root = process.cwd();

describe("corpus", () => {
  test(
    "loads 26 volumes and sectionOf matches structured sections",
    () => {
      const c = getCorpus(root);
      expect(c.volumes.size).toBe(26);
      expect(c.volumes.get("01")!.words.length).toBeGreaterThan(0);
      expect(c.volumes.get("01")!.sinograms.length).toBeGreaterThan(0);
      const n = c.sectionOf("01", "ㄅㄚ");
      expect(n).toBeGreaterThan(0);
    },
    20_000,
  );

  test("getCorpus returns same instance on second call", () => {
    expect(getCorpus(root)).toBe(getCorpus(root));
  });
});
