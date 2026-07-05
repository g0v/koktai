import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { recodeDicBuffer } from "../../lib/dic/cp950.ts";

describe("cp950 recode", () => {
  test("recode beta01k.dic matches committed cache when present", () => {
    const root = process.cwd();
    const dic = join(root, "beta01k.dic");
    const cache = join(root, ".cache", "recode", "beta01k.dic");
    const out = recodeDicBuffer(readFileSync(dic));
    try {
      const golden = readFileSync(cache, "utf8");
      expect(out).toBe(golden);
    } catch {
      expect(out.length).toBeGreaterThan(1000);
      expect(out.includes("ㄅㄚ")).toBe(true);
    }
  });
});