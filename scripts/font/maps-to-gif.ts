#!/usr/bin/env bun
/**
 * Regenerate the glyph GIF for every mapped Big5 codepoint (full corpus),
 * via the compiled `font/hfn/xfn2gif`. Port of font/maps_to_gif.py.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { charToStrcode, toFontGif } from "../../lib/font/gif.ts";
import { expandInnerM3, loadFontMaps } from "../../lib/font/maps.ts";

const fontDir = join(dirname(fileURLToPath(import.meta.url)), "../../font");

function isUnifiedIdeographString(str: string): boolean {
  return [...str].every((ch) => /\p{Unified_Ideograph}/u.test(ch));
}

export function generateAllGifs(options?: { force?: boolean }): void {
  const { kMap, kNorubyMap, m3Map, m3NorubyMap } = loadFontMaps(fontDir);
  const force = options?.force ?? false;

  for (const [strcode, str] of Object.entries(kMap)) {
    toFontGif(fontDir, "k", "k_ruby", strcode, expandInnerM3(str, m3NorubyMap), { force });
  }

  for (const [pua, str] of Object.entries(kNorubyMap)) {
    const strcode = charToStrcode(pua);
    const expanded = expandInnerM3(str, m3NorubyMap);
    if (isUnifiedIdeographString(str)) {
      toFontGif(fontDir, "k", "k_cjkv", strcode, expanded, { force });
    } else {
      toFontGif(fontDir, "k", "k_noruby", strcode, expanded, { force });
    }
  }

  for (const [strcode, str] of Object.entries(m3Map)) {
    toFontGif(fontDir, "m3", "m3_ruby", strcode, expandInnerM3(str, m3NorubyMap), { force });
  }

  for (const [strcode, str] of Object.entries(m3NorubyMap)) {
    toFontGif(fontDir, "m3", "m3_noruby", strcode, str, { force });
  }

  console.log();
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  generateAllGifs({ force });
}