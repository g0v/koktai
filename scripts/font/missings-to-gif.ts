#!/usr/bin/env bun
/**
 * Generate the glyph GIF for every <img> reference under html/ whose PNG is
 * not yet committed under img/. Port of font/missings_to_gif.py.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toFontGif } from "../../lib/font/gif.ts";
import { expandInnerM3, loadFontMaps } from "../../lib/font/maps.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fontDir = join(root, "font");
const htmlDir = join(root, "html");
const imgDir = join(root, "img");

const IMG_REF = /<img src="img\/(k|m3)\/([a-f0-9]+)\.png">/g;

export function findMissingCodes(): Array<[font: "k" | "m3", strcode: string]> {
  const codes = new Map<string, ["k" | "m3", string]>();
  for (const file of readdirSync(htmlDir).filter((f) => f.endsWith(".html"))) {
    const text = readFileSync(join(htmlDir, file), "utf8").replace(/^\uFEFF/, "");
    for (const [, font, strcode] of text.matchAll(IMG_REF)) {
      if (!existsSync(join(imgDir, font!, `${strcode}.png`))) {
        codes.set(`${font}/${strcode}`, [font as "k" | "m3", strcode!]);
      }
    }
  }
  return [...codes.values()];
}

export function generateMissingGifs(): void {
  const { kMap, kNorubyMap, m3Map, m3NorubyMap } = loadFontMaps(fontDir);
  for (const [font, strcode] of findMissingCodes()) {
    if (font === "k") {
      toFontGif(
        fontDir,
        "k",
        "k_missing",
        strcode,
        expandInnerM3(kNorubyMap[strcode] ?? kMap[strcode] ?? "", m3NorubyMap),
      );
    } else {
      toFontGif(
        fontDir,
        "m3",
        "m3_missing",
        strcode,
        m3NorubyMap[strcode] ?? expandInnerM3(m3Map[strcode] ?? "", m3NorubyMap),
      );
    }
  }
  console.log();
}

if (import.meta.main) generateMissingGifs();
