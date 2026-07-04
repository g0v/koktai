#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { jadeUnescapeLine, loadFontMaps } from "../lib/dic/unescape.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const maps = loadFontMaps(root);

const frag =
  "嘴<rt>ㄘㄨ丨˪</rt> 䩃*(/頰/䫌)<rt>ㄆㄨㆤˋ</rt>(廈)/<rt>ㄆㆤˋ</rt>(漳)";
const ts = jadeUnescapeLine(frag, maps);
const pl = spawnSync("perl", [join(root, "font/jade-unescape.pl")], {
  input: frag + "\n",
  encoding: "utf8",
  cwd: root,
}).stdout?.trimEnd();
console.log("frag eq", ts === pl);
if (ts !== pl) {
  console.log("TS", ts);
  console.log("PL", pl);
}