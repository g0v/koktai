#!/usr/bin/env bun
/** TS jadeUnescapeDocument vs Perl on identical pre-unescape body. */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recodeDicPathToUtf8 } from "../lib/dic/legacy-recode-oracle.ts";
import {
  finalizePugDocument,
  jadeUnescapeDocument,
  loadFontMaps,
} from "../lib/dic/unescape.ts";
import { resolveVolumeDic } from "../lib/dic/pipeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pyDir = join(root, "scripts/legacy-py3");
const vol = process.argv[2] ?? "01";

function py3PreBody(dic: string): string {
  const recoded = recodeDicPathToUtf8(dic);
  const dic2 = spawnSync("python3", [join(pyDir, "dic2jade.py")], {
    cwd: root,
    input: recoded,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pyDir },
  });
  if (dic2.status !== 0) throw new Error(dic2.stderr?.slice(0, 400));
  return dic2.stdout ?? "";
}

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

const dic = resolveVolumeDic(root, vol);
const pre = py3PreBody(dic);
const maps = loadFontMaps(root);
const ts = jadeUnescapeDocument(pre, maps);
const perl = perlUnescapeBody(pre);
const c = readFileSync(join(root, "pug", `${vol}.pug`), "utf8");

let n = 0;
let first = 0;
const tl = ts.split("\n");
const pl = perl.split("\n");
for (let i = 0; i < Math.max(tl.length, pl.length); i++) {
  if (tl[i] !== pl[i]) {
    n++;
    if (!first) first = i + 1;
  }
}
console.log(`py3 pre: TS unescape vs Perl+finalize: ${n} line diffs, first ${first || "-"}`);
console.log(`TS eq committed: ${ts === c}`);
console.log(`Perl eq committed: ${perl === c}`);

if (first) {
  const i = first - 1;
  console.log("TS:", JSON.stringify(tl[i]?.slice(0, 200)));
  console.log("PL:", JSON.stringify(pl[i]?.slice(0, 200)));
  const preLines = pre.split("\n");
  console.log("pre:", JSON.stringify(preLines[i]?.slice(0, 200)));
}