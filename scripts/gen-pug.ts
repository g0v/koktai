#!/usr/bin/env bun
/**
 * Regenerate `pug/*.pug` from `.dic` / appendix sources.
 * Pure TypeScript pipeline (`lib/dic/pipeline.ts`): recode → analyse → unescape.
 * Usage: `bun run gen:pug` (all) or `bun run gen:pug -- 15` (one volume) or `bun run gen:pug -- dic-cont`
 * Parity gate: `bun run diff:pug` (CI); legacy oracle: `PARITY_LEGACY=1 bun run parity:stage <stage>`.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOLUME_IDS,
  APPENDIX_SOURCES,
  resolveVolumeDic,
  appendixOutputBase,
  generatePugFromDicFile,
  generatePugFromTxtFile,
} from "../lib/dic/pipeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "pug");
mkdirSync(outDir, { recursive: true });

const scope = process.argv[2]?.trim();

function normalizeVol(arg: string): string | null {
  const n = Number.parseInt(arg, 10);
  if (!Number.isFinite(n) || n < 1 || n > 26) return null;
  return String(n).padStart(2, "0");
}

function writeVolume(vol: string): void {
  const dic = resolveVolumeDic(root, vol);
  const { text } = generatePugFromDicFile(root, dic);
  const out = join(outDir, `${vol}.pug`);
  writeFileSync(out, text, "utf8");
  console.log(`wrote ${out}`);
}

function writeAppendix(src: string): void {
  const path = join(root, src);
  const base = appendixOutputBase(src);
  const { text } = generatePugFromTxtFile(root, path);
  const out = join(outDir, `${base}.pug`);
  writeFileSync(out, text, "utf8");
  console.log(`wrote ${out}`);
}

if (!scope) {
  for (const vol of VOLUME_IDS) writeVolume(vol);
  for (const src of APPENDIX_SOURCES) writeAppendix(src);
} else {
  const vol = normalizeVol(scope);
  if (vol) {
    writeVolume(vol);
  } else {
    const src =
      APPENDIX_SOURCES.find(
        (s) => appendixOutputBase(s) === scope || s === scope || s.startsWith(scope),
      ) ?? null;
    if (!src) {
      console.error(`unknown scope "${scope}" — use 01–26 or appendix base name`);
      process.exit(1);
    }
    writeAppendix(src);
  }
}