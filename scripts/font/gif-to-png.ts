#!/usr/bin/env bun
/**
 * Convert every `.GIF` in a directory to `.png` (RGBA) in another.
 * Port of a-tsioh_sandbox/gif_to_png.py, using `sharp` instead of Pillow.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

export async function gifToPng(sourceDir: string, targetDir: string): Promise<void> {
  const sources = readdirSync(sourceDir).filter((f) => f.endsWith(".GIF"));
  for (const name of sources) {
    const out = join(targetDir, name.replace(/\.GIF$/, ".png"));
    await sharp(join(sourceDir, name)).ensureAlpha().png().toFile(out);
  }
}

if (import.meta.main) {
  const [sourceDir, targetDir] = process.argv.slice(2);
  if (!sourceDir || !targetDir) {
    console.error("usage: bun run scripts/font/gif-to-png.ts <source-dir> <target-dir>");
    process.exit(1);
  }
  await gifToPng(sourceDir, targetDir);
}
