#!/usr/bin/env bun
/**
 * Regenerate `pug/*.pug` from `.dic` / appendix sources.
 * Pure TypeScript pipeline (`lib/dic/pipeline.ts`): recode → analyse → unescape.
 * Parity gate: `bun run diff:pug`; legacy oracle: `bun run parity:stage <stage>`.
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

for (const vol of VOLUME_IDS) {
  const dic = resolveVolumeDic(root, vol);
  const { text } = generatePugFromDicFile(root, dic);
  const out = join(outDir, `${vol}.pug`);
  writeFileSync(out, text, "utf8");
  console.log(`wrote ${out}`);
}

for (const src of APPENDIX_SOURCES) {
  const path = join(root, src);
  const base = appendixOutputBase(src);
  const { text } = generatePugFromTxtFile(root, path);
  const out = join(outDir, `${base}.pug`);
  writeFileSync(out, text, "utf8");
  console.log(`wrote ${out}`);
}