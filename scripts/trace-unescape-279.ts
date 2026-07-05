#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recodeDicPathToUtf8 } from "../lib/dic/legacy-recode-oracle.ts";
import {
  jadeUnescapeLine,
  jadeUnescapeStages,
  loadFontMaps,
} from "../lib/dic/unescape.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pyDir = join(root, "archive/legacy-py3-parity");

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

const dicPath = join(
  root,
  readdirSync(root).filter((f) => f.endsWith(".dic") && f.includes("01")).sort()[0]!,
);
const line = py3PreBody(dicPath).split("\n").find((l) => l.includes("～掌[動短]"))!;
const maps = loadFontMaps(root);
const seg = (s: string) => {
  const i = s.indexOf("嘴");
  return s.slice(i, i + 200);
};

const { afterKRuby, afterM3Ruby } = jadeUnescapeStages(line, maps);
const ts = jadeUnescapeLine(line, maps);
const pl =
  spawnSync("perl", [join(root, "font/jade-unescape.pl")], {
    cwd: root,
    input: line + "\n",
    encoding: "utf8",
  }).stdout?.trimEnd() ?? "";

console.log("afterKRuby:", seg(afterKRuby));

const kcharQ =
  "(?:<mark>&#xf[0-9a-f]*;</mark>|<img src=\"img/k/[0-9a-f]+.png\">)";
const altQ = `(?:.|${kcharQ})(?:[:：](?:.|${kcharQ})*?)?`;
const altsQ = `\\*|\\*?(?:[(（]${altQ}?(?:[/／]${altQ})+[)）])+`;
const m3Ruby = new RegExp(
  `(～|\\(\\s+\\)|[^\\p{P}\\p{S}\\p{M}\\p{Z}])(${altsQ})?<rt>([^<>]*?)</rt>(?!</ruby>)`,
  "gu",
);
let m: RegExpExecArray | null;
const hits: string[] = [];
while ((m = m3Ruby.exec(afterKRuby)) !== null) {
  hits.push(`@${m.index} rb=${JSON.stringify(m[1])} alts=${JSON.stringify(m[2])} rt=${JSON.stringify(m[3])}`);
}
console.log("m3 hits on afterKRuby:", hits.length);
for (const h of hits.slice(0, 15)) console.log(h);
const idx = afterKRuby.search(/\*[(（][^<]*<rt>ㄆ/);
if (idx >= 0) {
  const start = idx - 2;
  const chunk = afterKRuby.slice(start, idx + 35);
  console.log("chunk:", JSON.stringify(chunk));
  console.log(
    "cps:",
    [...chunk].map((c) => c.codePointAt(0)!.toString(16)).join(" "),
  );
  const kcharQ2 =
    "(?:<mark>&#xf[0-9a-f]*;</mark>|<img src=\"img/k/[0-9a-f]+.png\">)";
  const altQ2 = `(?:.|${kcharQ2})(?:[:：](?:.|${kcharQ2})*?)?`;
  const altsQ2 = `\\*|\\*?(?:[(（]${altQ2}?(?:[/／]${altQ2})+[)）])+`;
  const fullM3 = new RegExp(
    `(～|\\(\\s+\\)|[^\\p{P}\\p{S}\\p{M}\\p{Z}])(${altsQ2})?<rt>([^<>]*?)</rt>(?!</ruby>)`,
    "u",
  );
  const fromBase = afterKRuby.slice(start);
  console.log("fullM3 from base:", fullM3.exec(fromBase)?.slice(0, 4));
  const onlyAlts = new RegExp(`^(${altsQ2})`, "u");
  console.log("alts on *(/", onlyAlts.exec(afterKRuby.slice(idx))?.[1]);
}
console.log("afterM3Ruby:", seg(afterM3Ruby));
console.log("final TS:  ", seg(ts));
console.log("final PL:  ", seg(pl));
console.log("m3 changed?", afterKRuby !== afterM3Ruby);