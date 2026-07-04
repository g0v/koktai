#!/usr/bin/env bun
/**
 * Strip the descriptive suffix from generated glyph GIFs, leaving `<strcode>.GIF`.
 * Port of font/rename_gifs.py.
 */
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

export function renameGifs(dir: string): void {
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".GIF"))) {
    const newName = name.replace(/\..*$/, ".GIF");
    if (newName !== name) renameSync(join(dir, name), join(dir, newName));
  }
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: bun run scripts/font/rename-gifs.ts <dir>");
    process.exit(1);
  }
  renameGifs(dir);
}
