#!/usr/bin/env bun
/**
 * Stage-level parity: legacy vs TS for recode / analyse / unescape.
 * Usage: bun run scripts/parity-stage.ts <stage> [volumeOrAppendix]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOLUME_IDS,
  APPENDIX_SOURCES,
  resolveVolumeDic,
} from "../lib/dic/pipeline.ts";
import { recodeDicFile } from "../lib/dic/cp950.ts";
import { py3PreFromDicText } from "../lib/dic/legacy-py3.ts";
import { dicTextToPugBody } from "../lib/dic/dic2pug.ts";
import { txtTextToPugBody } from "../lib/dic/txt2pug.ts";
import {
  perlUnescapeDocument,
  jadeUnescapeDocument,
  loadFontMaps,
} from "../lib/dic/unescape.ts";
import { STAGE_NAMES } from "../lib/dic/stages.ts";
import type { StageName } from "../lib/dic/stages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stageArg = process.argv[2];
const scope = process.argv[3];

function parseStage(arg: string | undefined): StageName | null {
  if (!arg) return null;
  return (STAGE_NAMES as readonly string[]).includes(arg) ? (arg as StageName) : null;
}

function firstDrift(a: string, b: string): { line?: number; bytes: [number, number] } {
  if (a === b) return { bytes: [a.length, b.length] };
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) return { line: i + 1, bytes: [a.length, b.length] };
  }
  return { bytes: [a.length, b.length] };
}

function bucketAnalyse(ts: string, py: string): Record<string, number> {
  const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
  return {
    h2_ts: count(ts, /^      h2 /gm),
    h2_py: count(py, /^      h2 /gm),
    h3_ts: count(ts, /^      h3 /gm),
    h3_py: count(py, /^      h3 /gm),
    dd_ts: count(ts, /^        dd /gm),
    dd_py: count(py, /^        dd /gm),
    u_ts: count(ts, /^          u /gm),
    u_py: count(py, /^          u /gm),
  };
}

async function main() {
  const stage = parseStage(stageArg);
  if (!stage) {
    console.error(
      `usage: bun run scripts/parity-stage.ts <${STAGE_NAMES.join("|")}> [volumeOrAppendix]`,
    );
    process.exit(1);
  }

  if (!scope) {
    const vols = VOLUME_IDS;
    const apps = APPENDIX_SOURCES;
    let fails = 0;
    for (const v of vols) {
      const dic = resolveVolumeDic(root, v);
      const ok = await checkOne(stage, dic, true);
      if (!ok) fails++;
    }
    for (const a of apps) {
      const ok = await checkOne(stage, join(root, a), false);
      if (!ok) fails++;
    }
    console.log(fails === 0 ? "ALL OK" : `${fails} FAIL`);
    process.exit(fails === 0 ? 0 : 1);
  } else if (/^\d\d$/.test(scope)) {
    const dic = resolveVolumeDic(root, scope);
    const ok = await checkOne(stage, dic, true);
    process.exit(ok ? 0 : 1);
  } else {
    const ok = await checkOne(stage, join(root, scope), false);
    process.exit(ok ? 0 : 1);
  }
}

async function checkOne(
  stage: StageName,
  path: string,
  isDic: boolean,
): Promise<boolean> {
  if (stage === "recode") return checkRecode(path);
  if (stage === "analyse") return isDic ? checkAnalyseDic(path) : checkAnalyseTxt(path);
  return checkUnescape(path, isDic);
}

function checkRecode(path: string): boolean {
  console.log(`recode ${path}: deferred (TS port not implemented)`);
  return false;
}

function checkAnalyseDic(dicPath: string): boolean {
  const recoded = recodeDicFile(root, dicPath);
  const py = py3PreFromDicText(root, recoded);
  const ts = dicTextToPugBody(recoded, root);
  const d = firstDrift(py, ts);
  if (d.line === undefined && py.length === ts.length) {
    console.log(`analyse ${dicPath}: OK`);
    return true;
  }
  console.log(
    `analyse ${dicPath}: drift line ${d.line ?? "-"} bytes ${ts.length} vs ${py.length}`,
  );
  console.log(JSON.stringify(bucketAnalyse(ts, py)));
  return false;
}

function checkAnalyseTxt(path: string): boolean {
  console.log(`analyse ${path}: TS-only (txtTextToPugBody)`);
  return true;
}

function checkUnescape(path: string, isDic: boolean): boolean {
  const recoded = recodeDicFile(root, path);
  const pre = isDic
    ? py3PreFromDicText(root, recoded)
    : txtTextToPugBody(recoded, root);
  const perl = perlUnescapeDocument(root, pre);
  const ts = jadeUnescapeDocument(pre, loadFontMaps(root));
  const d = firstDrift(perl, ts);
  if (d.line === undefined && perl.length === ts.length) {
    console.log(`unescape ${path}: OK`);
    return true;
  }
  console.log(
    `unescape ${path}: drift line ${d.line ?? "-"} bytes ${ts.length} vs ${perl.length}`,
  );
  console.log(
    JSON.stringify({
      ruby_ts: (ts.match(/<ruby>/g) ?? []).length,
      ruby_py: (perl.match(/<ruby>/g) ?? []).length,
      rt_ts: (ts.match(/<rt>/g) ?? []).length,
      rt_py: (perl.match(/<rt>/g) ?? []).length,
      thinsp_ts: (ts.match(/&thinsp;/g) ?? []).length,
      thinsp_py: (perl.match(/&thinsp;/g) ?? []).length,
    }),
  );
  return false;
}

main();