#!/usr/bin/env bun
/**
 * Full "regenerate missing glyph PNGs" pipeline: generate missing GIFs, strip
 * their descriptive suffix, then convert to PNG. Mirrors `make missings_to_png`
 * (font/Makefile); output lands in `font/k` / `font/m3`, matching the Makefile
 * so the manual "move into img/k or img/m3" review step is unchanged.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gifToPng } from "./gif-to-png.ts";
import { generateMissingGifs } from "./missings-to-gif.ts";
import { renameGifs } from "./rename-gifs.ts";

const fontDir = join(dirname(fileURLToPath(import.meta.url)), "../../font");

async function convertMissing(mapName: "k_missing" | "m3_missing", target: "k" | "m3"): Promise<void> {
  const sourceDir = join(fontDir, mapName);
  if (!existsSync(sourceDir)) return;
  renameGifs(sourceDir);
  const targetDir = join(fontDir, target);
  mkdirSync(targetDir, { recursive: true });
  await gifToPng(sourceDir, targetDir);
}

if (import.meta.main) {
  generateMissingGifs();
  await convertMissing("k_missing", "k");
  await convertMissing("m3_missing", "m3");
}
