/**
 * Subset 芫荽 Iansui (SIL OFL) for site chrome + zhuyin ruby.
 *
 * Source TTF: https://github.com/google/fonts/raw/main/ofl/iansui/Iansui-Regular.ttf
 * Subsetter:  pyftsubset (fontTools) — reuses ../grandma/.venv if present.
 *
 * Coverage = Han chars scanned from src/ + lib/ literals, plus the full
 * bopomofo blocks (standard + Taiwanese extension) and tone letters, so the
 * rail, guide plates, hero specimen, and every <rt> reading render in the
 * annotation face on all platforms.
 *
 * Output: html/font/iansui-koktai.woff2 (+ OFL) — `bun run sync` flows it
 * into public/font/.
 */
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { LABEL_ATOM_CHARS } from "../lib/extract/labels.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TTF = "/tmp/koktai-fonts/Iansui-Regular.ttf";
const OFL = "/tmp/koktai-fonts/OFL.txt";
const OUT_DIR = join(root, "html/font");
const OUT = join(OUT_DIR, "iansui-koktai.woff2");
const PYFT = join(root, "../grandma/.venv/bin/python3");

if (!existsSync(TTF)) {
  console.error(`missing ${TTF} — download:
  curl -sL -o ${TTF} https://github.com/google/fonts/raw/main/ofl/iansui/Iansui-Regular.ttf`);
  process.exit(1);
}

/* 1 — collect codepoints */
const cps = new Set<number>();

const addRange = (a: number, b: number) => {
  for (let c = a; c <= b; c++) cps.add(c);
};
const addText = (s: string) => {
  for (const ch of s) cps.add(ch.codePointAt(0)!);
};

function walkTextFiles(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walkTextFiles(p);
      continue;
    }
    if (!/\.(astro|ts|css)$/.test(name)) continue;
    addText(readFileSync(p, "utf8"));
  }
}

// site chrome literals (recursive — top-level-only scan missed lib/extract/labels.ts)
for (const dir of ["src/pages", "src/layouts", "src/styles", "lib"]) {
  walkTextFiles(join(root, dir));
}

// every register/geo/source label atom rendered in .usage-register badges
addText(LABEL_ATOM_CHARS);

addRange(0x20, 0x7e); // basic latin
addRange(0x3100, 0x312f); // bopomofo
addRange(0x31a0, 0x31bf); // bopomofo extended (Taiwanese)
addText("ˊˇˋ˙˪˫\u0307\u030d·—–―…「」『』《》〈〉（）、。，；：？！・〜→◀▶▍丨");

/* 2 — write unicodes file */
mkdirSync(OUT_DIR, { recursive: true });
const unicodes = [...cps]
  .filter((c) => c >= 0x20)
  .sort((a, b) => a - b)
  .map((c) => `U+${c.toString(16).toUpperCase().padStart(4, "0")}`)
  .join("\n");
const uniFile = "/tmp/koktai-fonts/unicodes.txt";
writeFileSync(uniFile, unicodes);

/* 3 — subset */
execFileSync(PYFT, [
  "-m",
  "fontTools.subset",
  TTF,
  `--unicodes-file=${uniFile}`,
  "--flavor=woff2",
  `--output-file=${OUT}`,
  "--layout-features=*",
  "--name-IDs=*",
  "--legacy-kern",
]);

if (existsSync(OFL)) copyFileSync(OFL, join(OUT_DIR, "OFL-Iansui.txt"));

const kb = (Bun.file(OUT).size / 1024).toFixed(1);
console.log(`subset ${cps.size} codepoints → ${OUT} (${kb} KB)`);
