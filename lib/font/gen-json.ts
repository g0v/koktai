/**
 * Regenerate `font/k.json` or `font/m3.json` from `font/usrfont.lst`.
 * Port of `archive/gen-json.pl`. JSON keys are **raw Big5 lead+trail bytes**
 * (`%02x` each), not CP950-decoded characters — read file as latin1 / byte pairs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BPMF: Record<string, string> = {
  "1": "ㄅ",
  q: "ㄆ",
  a: "ㄇ",
  z: "ㄈ",
  "2": "ㄉ",
  w: "ㄊ",
  s: "ㄋ",
  x: "ㄌ",
  e: "ㄍ",
  d: "ㄎ",
  c: "ㄏ",
  r: "ㄐ",
  f: "ㄑ",
  v: "ㄒ",
  "5": "ㄓ",
  t: "ㄔ",
  g: "ㄕ",
  b: "ㄖ",
  y: "ㄗ",
  h: "ㄘ",
  n: "ㄙ",
  u: "ㄧ",
  j: "ㄨ",
  m: "ㄩ",
  "8": "ㄚ",
  i: "ㄛ",
  k: "ㄜ",
  ",": "ㄝ",
  "9": "ㄞ",
  o: "ㄟ",
  l: "ㄠ",
  ".": "ㄡ",
  "0": "ㄢ",
  p: "ㄣ",
  ";": "ㄤ",
  "/": "ㄥ",
  "-": "ㄦ",
  "'": "ㄇ〾",
  Y: "ㆡ",
  "!": "ㆠ",
  A: "ㆬ",
  "@": "ㄉ〾",
  E: "ㆣ",
  C: "ㄬ",
  R: "ㆢ",
  U: "ㆪ",
  J: "ㆫ",
  "*": "ㆩ",
  K: "ㄜ〾",
  "]": "ㆤ",
  "}": "ㆥ",
  "(": "ㆮ",
  L: "ㆯ",
  "[": "ㆦ",
  "{": "ㆧ",
  ":": "ㆲ",
  "+": "ㆭ",
  $: "ㆱ",
  "#": "ㆰ",
  "=": "ㄫ",
  "&": "ㆨ",
};

const TONES_PREFIX: string[] = [];
TONES_PREFIX[15] = "˙";

const TONES = [
  "",
  "",
  "ˊ",
  "ˇ",
  "ˋ",
  "˪",
  "˫",
  "ㆷ",
  "ㆷ̇",
  "ㆴ",
  "ㆴ̇",
  "ㆶ",
  "ㆶ̇",
  "ㆵ",
  "ㆵ̇",
  "",
];

const LINE_RE = /^(m3|k) +(\S)(\S) +(.+),(\d+)\r?$/;

export function buildFontJsonFromUsrfont(
  usrfontLatin1: string,
  fontTarget: "k" | "m3",
  m3Noruby: Record<string, string>,
): Record<string, string> {
  const charToM3: Record<string, string> = {};
  for (const [code, ch] of Object.entries(m3Noruby)) {
    charToM3[ch] = code;
  }

  const out: Record<string, string> = {};

  for (const raw of usrfontLatin1.split("\n")) {
    if (!raw || raw.startsWith(".")) continue;
    const m = raw.match(LINE_RE);
    if (!m) continue;
    const [, font, hiCh, loCh, keys, toneStr] = m;
    if (font !== fontTarget) continue;
    const hi = hiCh.charCodeAt(0).toString(16).padStart(2, "0");
    const lo = loCh.charCodeAt(0).toString(16).padStart(2, "0");
    const tone = Number.parseInt(toneStr, 10);
    const reading = mapKeys(keys, charToM3) + (TONES[tone] ?? "");
    const prefix = TONES_PREFIX[tone] ?? "";
    out[`${hi}${lo}`] = `${prefix}${reading}`;
  }

  return out;
}

function mapKeys(keys: string, charToM3: Record<string, string>): string {
  let s = "";
  for (const key of keys) {
    let ch = BPMF[key];
    if (!ch) continue;
    if (ch.includes("〾") && charToM3[ch]) {
      const code = charToM3[ch];
      ch = String.fromCodePoint(0xf0000 + Number.parseInt(code, 16));
    }
    s += ch;
  }
  return s;
}

export function writeFontJson(
  repoRoot: string,
  font: "k" | "m3",
): void {
  const fontDir = join(repoRoot, "font");
  const buf = readFileSync(join(fontDir, "usrfont.lst"));
  const latin1 = buf.toString("latin1");
  const m3Noruby = JSON.parse(
    readFileSync(join(fontDir, "m3_noruby.json"), "utf8"),
  ) as Record<string, string>;
  const obj = buildFontJsonFromUsrfont(latin1, font, m3Noruby);
  const outPath = join(fontDir, `${font}.json`);
  writeFileSync(outPath, `${JSON.stringify(obj, null, 0)}\n`, "utf8");
  console.log(`wrote ${outPath} (${Object.keys(obj).length} entries)`);
}

if (import.meta.main) {
  const font = (process.argv[2] ?? "").trim();
  if (font !== "k" && font !== "m3") {
    console.error("usage: bun run scripts/font/gen-json.ts <k|m3>");
    process.exit(1);
  }
  const root = join(import.meta.dir, "../..");
  writeFontJson(root, font);
}