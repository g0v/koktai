#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recodeDicFile } from "../lib/dic/cp950.ts";
import { recodeDicPathToUtf8 } from "../lib/dic/legacy-recode-oracle.ts";
import { dicTextToPugBody } from "../lib/dic/dic2pug.ts";
import { resolveVolumeDic } from "../lib/dic/pipeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pyDir = join(root, "scripts/legacy-py3");
const vol = process.argv[2] ?? "01";
const dic = resolveVolumeDic(root, vol);

function py3Pre(dicPath: string): string {
  const recoded = recodeDicPathToUtf8(dicPath);
  const dic2 = spawnSync("python3", [join(pyDir, "dic2jade.py")], {
    cwd: root,
    input: recoded,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pyDir },
  });
  return dic2.stdout ?? "";
}

const ts = dicTextToPugBody(recodeDicFile(dic), root).split("\n");
const py = py3Pre(dic).split("\n");
let n = 0;
for (let i = 0; i < Math.max(ts.length, py.length); i++) {
  if (ts[i] !== py[i]) {
    n++;
    if (n <= 20) {
      console.log(`--- line ${i + 1} ---`);
      console.log("TS:", JSON.stringify(ts[i]?.slice(0, 120)));
      console.log("PY:", JSON.stringify(py[i]?.slice(0, 120)));
    }
  }
}
console.log("total", n);