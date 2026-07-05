#!/usr/bin/env bun
/** Bucket line diffs: pre-unescape, TS vs Perl unescape on same pre, vs committed. */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { recodeDicFile } from "../lib/dic/cp950.ts";
import { recodeDicPathToUtf8 } from "../lib/dic/legacy-recode-oracle.ts";
import { dicTextToPugBody } from "../lib/dic/dic2pug.ts";
import {
  jadeUnescapeDocument,
  jadeUnescapeLine,
  loadFontMaps,
  finalizePugDocument,
} from "../lib/dic/unescape.ts";
import { generatePugFromDicFile } from "../lib/dic/pipeline.ts";
import { resolveVolumeDic } from "../lib/dic/pipeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vol = process.argv[2] ?? "01";
const pyDir = join(root, "archive/legacy-py3-parity");

function perlUnescapeBody(body: string): string {
  const unesc = spawnSync("perl", [join(root, "font/jade-unescape.pl")], {
    cwd: root,
    input: body,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (unesc.status !== 0) throw new Error(unesc.stderr?.slice(0, 300));
  return finalizePugDocument(unesc.stdout ?? "");
}

function py3PreBody(dic: string): string {
  const recoded = recodeDicPathToUtf8(dic);
  const dic2 = spawnSync("python3", [join(pyDir, "dic2jade.py")], {
    cwd: root,
    input: recoded,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pyDir },
  });
  if (dic2.status !== 0) throw new Error(dic2.stderr?.slice(0, 500));
  return dic2.stdout ?? "";
}

function norm(s: string): string {
  let t = s.replace(/^\n/, "");
  if (!t.endsWith("\n")) t += "\n";
  return t;
}

function lineDiffs(a: string, b: string): { count: number; first?: number } {
  const al = a.split("\n");
  const bl = b.split("\n");
  let count = 0;
  let first: number | undefined;
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) {
      count++;
      if (first === undefined) first = i + 1;
    }
  }
  return { count, first };
}

function role(line: string | undefined): string {
  if (!line) return "?";
  if (line.startsWith("doctype")) return "doctype";
  if (line.startsWith("extends")) return "extends";
  if (line.startsWith("block")) return "block";
  if (line.startsWith("  dt")) return "dt";
  if (line.startsWith("  dd")) return "dd";
  return "other";
}

const dic = resolveVolumeDic(root, vol);
const tsPre = dicTextToPugBody(recodeDicFile(dic), root);
const pyPre = py3PreBody(dic);
const pre = lineDiffs(tsPre, pyPre);
console.log(
  `vol ${vol} pre-unescape TS vs py3: ${pre.count} line diffs, lines ${tsPre.split("\n").length} vs ${pyPre.split("\n").length}, first ${pre.first ?? "-"}`,
);

const maps = loadFontMaps(root);
const tsFull = generatePugFromDicFile(root, dic).text;
const tsPrePerl = perlUnescapeBody(tsPre);
const pyPrePerl = perlUnescapeBody(pyPre);
const pyPreTs = jadeUnescapeDocument(pyPre, maps);

const committedPath = join(root, "pug", `${vol}.pug`);
const committed = readFileSync(committedPath, "utf8");
const c = norm(committed);

const dTs = lineDiffs(norm(tsFull), c);
const dTsPerl = lineDiffs(norm(tsPrePerl), c);
const dPyPerl = lineDiffs(norm(pyPrePerl), c);
const dPyTs = lineDiffs(norm(pyPreTs), c);
const dPyTsVsPerl = lineDiffs(norm(pyPreTs), norm(pyPrePerl));

console.log(`TS gen vs committed: ${dTs.count} diffs, first ${dTs.first ?? "-"}, bytes ${tsFull.length} vs ${committed.length}`);
console.log(`TS pre + Perl unesc vs committed: ${dTsPerl.count} diffs, first ${dTsPerl.first ?? "-"}`);
console.log(`py3 pre + Perl unesc vs committed: ${dPyPerl.count} diffs, first ${dPyPerl.first ?? "-"}`);
console.log(`py3 pre + TS unesc vs committed: ${dPyTs.count} diffs, first ${dPyTs.first ?? "-"}`);
console.log(`py3 pre: TS unesc vs Perl+finalize: ${dPyTsVsPerl.count} line diffs, first ${dPyTsVsPerl.first ?? "-"}`);

if (dTsPerl.first) {
  const i = dTsPerl.first - 1;
  const tl = norm(tsPrePerl).split("\n");
  const cl = c.split("\n");
  console.log("TS+Perl line:", JSON.stringify(tl[i]?.slice(0, 160)));
  console.log("committed:", JSON.stringify(cl[i]?.slice(0, 160)));
  const preLine = tsPre.split("\n")[i];
  if (preLine) {
    console.log("TS unesc line:", JSON.stringify(jadeUnescapeLine(preLine, maps).slice(0, 160)));
  }
}

let roleMismatch = 0;
const gl = norm(tsFull).split("\n");
const cl = c.split("\n");
for (let i = 0; i < Math.min(gl.length, cl.length); i++) {
  if (gl[i] !== cl[i] && role(gl[i]) !== role(cl[i])) roleMismatch++;
}
console.log(`role mismatches (TS vs C, same line index): ${roleMismatch}`);