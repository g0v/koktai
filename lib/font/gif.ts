/**
 * Glyph GIF generation via the Rust `xfn2gif` binary (`crates/koktai-font`).
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
  const repoRoot = join(fontDir, "..");
  const xfn2gif =
    (process.env.KOKTAI_XFN2GIF && existsSync(process.env.KOKTAI_XFN2GIF)
      ? process.env.KOKTAI_XFN2GIF
      : null) ??
    [join(repoRoot, "target/release/xfn2gif"), join(repoRoot, "target/debug/xfn2gif"), join(repoRoot, "font/hfn/xfn2gif")].find(
      (p) => existsSync(p),
    );
  if (!xfn2gif) {
    throw new Error(
      "xfn2gif not found: run `cargo build --release -p koktai-font` or set KOKTAI_XFN2GIF",
    );
  }

  const mapDir = join(fontDir, mapName);
  mkdirSync(mapDir, { recursive: true });
  const fontfileCode = join(mapDir, `${strcode}.GIF`);
  const fontfile = str ? join(mapDir, `${strcode}.${safeFname(str)}.GIF`) : fontfileCode;
  if (existsSync(fontfile) || existsSync(fontfileCode)) return;
  process.stdout.write(`\r${fontfile}`);
  const result = spawnSync(
    xfn2gif,
    ["-i", join(fontDir, "etp.xfn"), "-o", fontfile, "-t", font, "-c", strcode],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`xfn2gif exited with status ${result.status ?? "unknown"}`);
  }
}