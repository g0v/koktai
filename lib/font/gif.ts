/**
 * Glyph GIF generation via the compiled `font/hfn/xfn2gif` tool.
 * Port of the shared helpers in font/maps_to_gif.py.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SAFE_FNAME_TABLE: Record<string, string> = {
  "\\": "＼",
  "/": "／",
  ":": "：",
  "*": "＊",
  "?": "？",
  '"': "＂",
  "<": "＜",
  ">": "＞",
  "|": "｜",
};

/** Replace filesystem-unsafe characters so a glyph string can be used in a filename. */
export function safeFname(name: string): string {
  return [...name].map((ch) => SAFE_FNAME_TABLE[ch] ?? ch).join("");
}

/** Strip a PUA supplementary-plane character (U+F0000 + Big5 code) down to its 4-hex strcode. */
export function charToStrcode(ch: string): string {
  return (ch.codePointAt(0)! - 0xf0000).toString(16).padStart(4, "0");
}

/**
 * Generate `<fontDir>/<mapName>/<strcode>[.<str>].GIF` via `xfn2gif`, unless a
 * file for `strcode` (with or without the descriptive `str` suffix) already exists.
 */
export function toFontGif(
  fontDir: string,
  font: "k" | "m3",
  mapName: string,
  strcode: string,
  str: string,
): void {
  const mapDir = join(fontDir, mapName);
  mkdirSync(mapDir, { recursive: true });
  const fontfileCode = join(mapDir, `${strcode}.GIF`);
  const fontfile = str ? join(mapDir, `${strcode}.${safeFname(str)}.GIF`) : fontfileCode;
  if (existsSync(fontfile) || existsSync(fontfileCode)) return;
  process.stdout.write(`\r${fontfile}`);
  spawnSync(
    join(fontDir, "hfn/xfn2gif"),
    ["-i", join(fontDir, "etp.xfn"), "-o", fontfile, "-t", font, "-c", strcode],
    { stdio: "inherit" },
  );
}
