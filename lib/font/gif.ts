/**
 * Glyph GIF generation via the Rust `xfn2gif` binary (`crates/koktai-font`).
 * Port of the shared helpers in font/maps_to_gif.py.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

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

export function resolveXfn2Gif(repoRoot: string): string {
  const fromEnv =
    process.env.KOKTAI_XFN2GIF && existsSync(process.env.KOKTAI_XFN2GIF)
      ? process.env.KOKTAI_XFN2GIF
      : null;
  const candidate =
    fromEnv ??
    [
      join(repoRoot, "target/release/xfn2gif"),
      join(repoRoot, "target/debug/xfn2gif"),
      join(repoRoot, "font/hfn/xfn2gif"),
    ].find((p) => existsSync(p));
  if (!candidate) {
    throw new Error(
      "xfn2gif not found: run `cargo build --release -p koktai-font` or set KOKTAI_XFN2GIF",
    );
  }
  return candidate;
}

function removeExistingGifsForCode(mapDir: string, strcode: string): void {
  const prefix = `${strcode}.`;
  for (const name of readdirSync(mapDir)) {
    if (!name.toUpperCase().endsWith(".GIF")) continue;
    if (name === `${strcode}.GIF` || name.startsWith(prefix)) {
      unlinkSync(join(mapDir, name));
    }
  }
}

export type ToFontGifOptions = {
  /** Regenerate even when a GIF for this strcode already exists. */
  force?: boolean;
};

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
  options?: ToFontGifOptions,
): void {
  const repoRoot = join(fontDir, "..");
  const xfn2gif = resolveXfn2Gif(repoRoot);

  const mapDir = join(fontDir, mapName);
  mkdirSync(mapDir, { recursive: true });
  const fontfileCode = join(mapDir, `${strcode}.GIF`);
  const fontfile = str ? join(mapDir, `${strcode}.${safeFname(str)}.GIF`) : fontfileCode;
  if (!options?.force && (existsSync(fontfile) || existsSync(fontfileCode))) return;
  if (options?.force) removeExistingGifsForCode(mapDir, strcode);

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

/** Write one glyph GIF to an explicit path (always overwrites). */
export function writeGlyphGif(
  fontDir: string,
  font: "k" | "m3",
  strcode: string,
  outputGif: string,
): void {
  const repoRoot = join(fontDir, "..");
  const xfn2gif = resolveXfn2Gif(repoRoot);
  mkdirSync(dirname(outputGif), { recursive: true });
  if (existsSync(outputGif)) unlinkSync(outputGif);
  const result = spawnSync(
    xfn2gif,
    ["-i", join(fontDir, "etp.xfn"), "-o", outputGif, "-t", font, "-c", strcode],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`xfn2gif exited with status ${result.status ?? "unknown"}`);
  }
}