#!/usr/bin/env bun
/**
 * Run TS recode | py3 dic2jade | jade-unescape (+ finalize) vs committed pug.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { recodeDicPathToUtf8 } from "../lib/dic/legacy-recode-oracle.ts";
import { finalizePugDocument } from "../lib/dic/unescape.ts";
import { resolveVolumeDic } from "../lib/dic/pipeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pyDir = join(root, "archive/legacy-py3-parity");
const vol = process.argv[2] ?? "01";

function runLegacyPug(volume: string): string {
  const dic = resolveVolumeDic(root, volume);
  const recoded = recodeDicPathToUtf8(dic);
  const dic2 = spawnSync("python3", [join(pyDir, "dic2jade.py")], {
    cwd: root,
    input: recoded,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pyDir },
  });
  if (dic2.status !== 0) {
    throw new Error(`dic2jade failed: ${dic2.stderr?.toString().slice(0, 500)}`);
  }
  const unesc = spawnSync("perl", [join(root, "font/jade-unescape.pl")], {
    cwd: root,
    input: dic2.stdout,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (unesc.status !== 0) {
    throw new Error(`jade-unescape failed: ${unesc.stderr?.slice(0, 300)}`);
  }
  return finalizePugDocument(unesc.stdout ?? "");
}

const committedPath = join(root, "pug", `${vol}.pug`);
if (!existsSync(committedPath)) {
  console.error("missing", committedPath);
  process.exit(1);
}
const committed = readFileSync(committedPath, "utf8");
const legacy = runLegacyPug(vol);
/** Committed corpus starts with a blank line before `doctype`. */
function normalizeCommittedPug(s: string): string {
  let t = s.replace(/^\n/, "");
  if (!t.endsWith("\n")) t += "\n";
  return t;
}
const equal =
  legacy === committed || normalizeCommittedPug(legacy) === normalizeCommittedPug(committed);
console.log(`vol ${vol}: legacy chain === committed ? ${equal}`);
console.log(`bytes legacy ${legacy.length} committed ${committed.length}`);
if (!equal) {
  const gl = legacy.split("\n");
  const cl = committed.split("\n");
  for (let i = 0; i < Math.min(gl.length, cl.length); i++) {
    if (gl[i] !== cl[i]) {
      console.log("first diff line", i + 1);
      console.log("L:", JSON.stringify(gl[i]?.slice(0, 120)));
      console.log("C:", JSON.stringify(cl[i]?.slice(0, 120)));
      break;
    }
  }
  const outDir = join(root, ".cache");
  mkdirSync(outDir, { recursive: true });
  const dump = join(outDir, `legacy-oracle-${vol}.pug`);
  writeFileSync(dump, legacy, "utf8");
  console.log("wrote", dump);
}
process.exit(equal ? 0 : 1);