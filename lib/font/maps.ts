/**
 * Load the private-use-area <-> Unicode glyph maps used by the font tooling.
 * Port of the map-loading half of font/maps_to_gif.py.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { charToStrcode } from "./gif.ts";

export interface FontMaps {
  /** font/k.json: strcode -> ruby string (may embed PUA glyph placeholders). */
  kMap: Record<string, string>;
  /** a-tsioh_sandbox/mapping.json: PUA glyph character -> plain Unicode string. */
  kNorubyMap: Record<string, string>;
  /** font/m3.json: strcode -> ruby string (may embed PUA glyph placeholders). */
  m3Map: Record<string, string>;
  /** font/m3_noruby.json: strcode -> plain Unicode character. */
  m3NorubyMap: Record<string, string>;
}

function loadJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

export function loadFontMaps(fontDir: string): FontMaps {
  return {
    kMap: loadJson(join(fontDir, "k.json")),
    kNorubyMap: loadJson(join(fontDir, "../a-tsioh_sandbox/mapping.json")),
    m3Map: loadJson(join(fontDir, "m3.json")),
    m3NorubyMap: loadJson(join(fontDir, "m3_noruby.json")),
  };
}

/** Replace any embedded PUA glyph placeholder in `str` with its mapped Unicode form. */
export function expandInnerM3(str: string, m3NorubyMap: Record<string, string>): string {
  return [...str].map((ch) => m3NorubyMap[charToStrcode(ch)] ?? ch).join("");
}
