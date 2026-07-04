#!/usr/bin/env bun
/** Bucket line diffs: pre-unescape, TS vs Perl unescape on same pre, vs committed. */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { recodeDicFile } from "../lib/dic/cp950.ts";
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
const pyDir = join(root, "scripts/legacy-py3");

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
  const recode = spawnSync("perl", [join(root, "a-tsioh_sandbox/recode_utf8.pl"), dic], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  });
  const dic2 = spawnSync("python3", [join(pyDir, "dic2jade.py")], {
    cwd: root,
    input: recode.stdout,
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
  const n = Math.max(al.length, bl.length);
  for (let i = 0; i < n; i++) {
    if (al[i] !== bl[i]) {
      count++;
      if (first === undefined) first = i + 1;
    }
  }
  return { count, first };
}

function role(line: string | undefined): string {
  if (!line) return "?";
  const t = line.trimStart();
  if (t.startsWith("u ")) return "u";
  if (t.startsWith("dd")) return "dd";
  if (t.startsWith("h3 ")) return "h3";
  if (t.startsWith("div")) return "div";
  return "other";
}

const dic = resolveVolumeDic(root, vol);
const tsPre = dicTextToPugBody(recodeDicFile(root, dic), root);
const pyPre = py3PreBody(dic);
const pre = lineDiffs(tsPre, pyPre);
console.log(`vol ${vol} pre-unescape TS vs py3: ${pre.count} line diffs, lines ${tsPre.split("\n").length} vs ${pyPre.split("\n").length}, first ${pre.first ?? "-"}`);

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

// Per-line unescape on first differing dd (if any)
if (dTsPerl.first) {
  const i = dTsPerl.first - 1;
  const pl = pyPre.split("\n");
  const line = pl[i];
  if (line) {
    const tsU = jadeUnescapeLine(line, maps);
    const perlU = spawnSync("perl", [join(root, "font/jade-unescape.pl")], {
      input: line + "\n",
      encoding: "utf8",
    }).stdout?.replace(/\n$/, "") ?? "";
    console.log(`\nFirst py pre line where TS+Perl≠C is post-unescape; sample pre line ${i + 1}:`);
    console.log("pre:", JSON.stringify(line.slice(0, 100)));
    console.log("TS unesc eq Perl:", tsU === perlU);
    if (tsU !== perlU) {
      for (let j = 0; j < Math.max(tsU.length, perlU.length); j++) {
        if (tsU[j] !== perlU[j]) {
          console.log("unesc diff @", j, "TS", JSON.stringify(tsU.slice(j, j + 40)));
          console.log("Perl", JSON.stringify(perlU.slice(j, j + 40)));
          break;
        }
      }
    }
  }
}

// Role mismatch on TS vs committed at same index
let roleMismatch = 0;
const gl = norm(tsFull).split("\n");
const cl = c.split("\n");
for (let i = 0; i < Math.min(gl.length, cl.length); i++) {
  if (gl[i] !== cl[i] && role(gl[i]) !== role(cl[i])) roleMismatch++;
}
console.log(`role mismatches (TS vs C, same line index): ${roleMismatch}`);