import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Syllables, PuaClass } from "./types.ts";

function loadJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

let cache: Syllables | null = null;
export function loadSyllables(root: string): Syllables {
  if (cache) return cache;
  const m3 = loadJson(join(root, "font/m3.json"));
  const k = loadJson(join(root, "font/k.json"));
  const m3Noruby = loadJson(join(root, "font/m3_noruby.json"));
  const mapping = loadJson(join(root, "a-tsioh_sandbox/mapping.json"));
  const m3Reverse: Record<string, string> = {};
  for (const [hex, zy] of Object.entries(m3)) m3Reverse[zy] ??= hex;
  cache = { m3, k, m3Noruby, mapping, m3Reverse };
  return cache;
}

export function puaHex(ch: string): string {
  return (ch.codePointAt(0)! - 0xf0000).toString(16).padStart(4, "0");
}

export function isPua(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return cp >= 0xf0000 && cp <= 0xfffff;
}

/** Bopomofo + extensions + tone marks (˙ ˊ ˇ ˋ ˪ ˫) + combining dot (ㆷ̇). */
const BOPO = /^[\u3105-\u312f\u31a0-\u31bf\u02d9\u02ca\u02c7\u02cb\u02ea\u02eb\u0307\s]+$/u;

/** Classify a bare PUA char (outside `<k>…</k>`). Kai contextual readings use `s.k[hex]` in Task 5 normalize, not here. */
export function classifyPua(ch: string, s: Syllables): PuaClass {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0xfc6a1 && cp <= 0xfc6a9) {
    return { type: "symbol", text: String.fromCodePoint(0x245f + (cp - 0xfc6a0)) };
  }
  const hex = puaHex(ch);
  const m3 = s.m3[hex];
  if (m3 !== undefined) return { type: "reading", zhuyin: m3 };
  const k = s.k[hex];
  if (k !== undefined) {
    if (BOPO.test(k)) {
      const m3Hex = s.m3Reverse[k];
      return m3Hex !== undefined
        ? { type: "kReading", zhuyin: k, m3Hex }
        : { type: "kReading", zhuyin: k };
    }
    return { type: "kGlyph", text: k };
  }
  const noruby = s.m3Noruby[hex];
  if (noruby !== undefined && !noruby.includes("〾")) return { type: "symbol", text: noruby };
  const mapped = s.mapping[ch];
  if (mapped !== undefined) return { type: "symbol", text: mapped };
  return { type: "glyph" };
}