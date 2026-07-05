#!/usr/bin/env bun
/**
 * Force-regenerate every committed dictionary glyph PNG under `img/k` and `img/m3`
 * using the Rust `xfn2gif` (transparent white background), then refresh map
 * staging GIFs under `font/*_ruby` etc. when `--maps` is passed.
 *
 * Usage:
 *   bun run font:build
 *   bun run regen:glyphs           # img/*.png only (~10k)
 *   bun run regen:glyphs -- --maps # also font map dirs (~7.6k GIFs)
 */
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { writeGlyphGif } from "../../lib/font/gif.ts";
import { generateAllGifs } from "./maps-to-gif.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fontDir = join(root, "font");
const imgDir = join(root, "img");
const tmpDir = join(fontDir, "_regen_tmp");

async function regenImgTree(font: "k" | "m3"): Promise<number> {
  const dir = join(imgDir, font);
  const names = readdirSync(dir).filter((f) => f.endsWith(".png"));
  mkdirSync(tmpDir, { recursive: true });
  let n = 0;
  for (const name of names) {
    const strcode = name.replace(/\.png$/i, "");
    const gif = join(tmpDir, `${font}_${strcode}.GIF`);
    const png = join(dir, name);
    process.stdout.write(`\rimg/${font}/${name} (${++n}/${names.length})`);
    writeGlyphGif(fontDir, font, strcode, gif);
    await sharp(gif).ensureAlpha().png().toFile(png);
  }
  console.log();
  return names.length;
}

if (import.meta.main) {
  const withMaps = process.argv.includes("--maps");
  const k = await regenImgTree("k");
  const m3 = await regenImgTree("m3");
  console.log(`Regenerated ${k + m3} PNGs under img/`);
  if (withMaps) {
    console.log("Regenerating font map GIFs…");
    generateAllGifs({ force: true });
  }
}