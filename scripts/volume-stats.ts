#!/usr/bin/env bun
/** Report built volume HTML size and DOM counts (payload / parse cost proxy). */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { VOLUME_IDS } from "../lib/dic/pipeline.ts";

const dist = join(import.meta.dir, "..", "dist");
const rows: Array<{
  vol: string;
  bytes: number;
  gzip: number;
  sections: number;
  entries: number;
}> = [];

for (const vol of VOLUME_IDS) {
  const path = join(dist, `${vol}.html`);
  if (!existsSync(path)) {
    console.error(`missing ${path} — run astro build first`);
    process.exit(1);
  }
  const buf = readFileSync(path);
  const html = buf.toString("utf8");
  const sections = (html.match(/<section class="syl"/g) ?? []).length;
  const entries = (html.match(/class="entry /g) ?? []).length;
  rows.push({
    vol,
    bytes: buf.length,
    gzip: gzipSync(buf).length,
    sections,
    entries,
  });
}

rows.sort((a, b) => b.bytes - a.bytes);
const total = rows.reduce((s, r) => s + r.bytes, 0);
console.log("vol   bytes(MiB)  gzip(KiB)  sections  entries");
for (const r of rows) {
  console.log(
    `${r.vol}   ${(r.bytes / (1024 * 1024)).toFixed(2).padStart(7)}  ${(r.gzip / 1024).toFixed(0).padStart(7)}  ${String(r.sections).padStart(8)}  ${String(r.entries).padStart(7)}`,
  );
}
console.log(`total ${(total / (1024 * 1024)).toFixed(2)} MiB raw HTML across 26 volumes`);
console.log(
  "\nNote: content-visibility skips offscreen layout/paint; it does NOT reduce download, HTML parse, or full DOM node count.",
);