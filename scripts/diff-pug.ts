#!/usr/bin/env bun
/**
 * Compare TS-generated pug (in memory) vs committed `pug/*.pug`.
 * Exit 1 on byte mismatch or structural invariant drift.
 */
import { readFileSync, existsSync } from "node:fs";
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
const pugDir = join(root, "pug");

export interface PugInvariants {
  h2: number;
  h3: number;
  lines: number;
}

export function countInvariants(text: string): PugInvariants {
  const lines = text.split("\n");
  let h2 = 0;
  let h3 = 0;
  for (const line of lines) {
    if (/^\s+h2 /.test(line)) h2++;
    if (/^\s+h3 /.test(line)) h3++;
  }
  return { h2, h3, lines: lines.length };
}


interface DiffResult {
  base: string;
  ok: boolean;
  reason?: string;
}

function compareBase(base: string, generated: string): DiffResult {
  const committedPath = join(pugDir, `${base}.pug`);
  if (!existsSync(committedPath)) {
    return { base, ok: false, reason: "missing committed file" };
  }
  const committed = readFileSync(committedPath, "utf8");
  if (generated === committed) return { base, ok: true };

  const gi = countInvariants(generated);
  const ci = countInvariants(committed);
  const inv =
    gi.h2 === ci.h2 && gi.h3 === ci.h3
      ? "invariants match"
      : `invariants h2 ${gi.h2} vs ${ci.h2}, h3 ${gi.h3} vs ${ci.h3}`;
  const lenNote =
    generated.length !== committed.length
      ? `; bytes ${generated.length} vs ${committed.length}`
      : "";
  return {
    base,
    ok: false,
    reason: `text differs (${inv}; lines ${gi.lines} vs ${ci.lines}${lenNote})`,
  };
}

function resolveDiffScope(argv2: string | undefined): {
  volumeIds: string[];
  appendixSources: readonly string[];
} {
  const raw = argv2?.trim();
  if (!raw) {
    return { volumeIds: [...VOLUME_IDS], appendixSources: APPENDIX_SOURCES };
  }
  const norm = raw.toLowerCase();
  if (/^\d{1,2}$/.test(norm)) {
    return { volumeIds: [norm.padStart(2, "0")], appendixSources: [] };
  }
  const bases = APPENDIX_SOURCES.map((s) => appendixOutputBase(s));
  const base = bases.find(
    (b) =>
      b.toLowerCase() === norm ||
      b.toLowerCase().replaceAll("-", "") === norm.replaceAll("-", ""),
  );
  if (!base) {
    console.error(`unknown volume/appendix: ${argv2}`);
    process.exit(1);
  }
  const src = APPENDIX_SOURCES.find((s) => appendixOutputBase(s) === base)!;
  return { volumeIds: [], appendixSources: [src] };
}

const { volumeIds, appendixSources } = resolveDiffScope(process.argv[2]);
const results: DiffResult[] = [];

for (const vol of volumeIds) {
  const dic = resolveVolumeDic(root, vol);
  const { text } = generatePugFromDicFile(root, dic);
  results.push(compareBase(vol, text));
}

for (const src of appendixSources) {
  const path = join(root, src);
  const base = appendixOutputBase(src);
  const { text } = generatePugFromTxtFile(root, path);
  results.push(compareBase(base, text));
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(r.ok ? `OK ${r.base}` : `FAIL ${r.base}: ${r.reason}`);
}
if (failed.length > 0) process.exit(1);