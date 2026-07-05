import { readFileSync } from "node:fs";
import { CP950_BY_LEAD_TRAIL } from "./cp950-table.ts";

/** Valid CP950 trail byte: 0x40–0x7E or 0xA1–0xFE. */
export function isCp950TrailByte(b: number): boolean {
  return (b >= 0x40 && b <= 0x7e) || (b >= 0xa1 && b <= 0xfe);
}

/**
 * Big5 user-defined area (Encode::CP950 maps these pairs to U+E000–U+F8FF):
 * leads 0x81–0xA0 and 0xFA–0xFE (full trail range), plus 0xC6A1–0xC8FE.
 * Standard-plane leads 0xA1–0xF9 use the embedded table (not UDA).
 */
export function isCp950UserDefinedPair(hi: number, lo: number): boolean {
  if (hi >= 0x81 && hi <= 0xa0) return true;
  if (hi >= 0xfa && hi <= 0xfe) return true;
  if (hi === 0xc6) return lo >= 0xa1;
  return hi === 0xc7 || hi === 0xc8;
}

/** Table lookup: code point or 0 if unmapped (non-UDA pairs only). */
export function cp950TableCodePoint(hi: number, lo: number): number {
  return CP950_BY_LEAD_TRAIL[hi]?.[lo] ?? 0;
}

function decodeCp950Pair(hi: number, lo: number): string {
  const cp = cp950TableCodePoint(hi, lo);
  if (cp === 0) return "\uFFFD";
  return cp <= 0xffff ? String.fromCharCode(cp) : String.fromCodePoint(cp);
}

/**
 * CP950 → string with user-defined codes lifted straight to U+F0000 + Big5
 * code — the composed effect of Perl Encode CP950's UDA→BMP-PUA mapping
 * followed by `remap_pua`'s re-encode in `recode_utf8.pl`. Byte 0x80 passes
 * through as U+0080 and lone 0xFF (CP950 single-byte UDA U+F8F8) lifts to
 * U+F00FF, matching Encode; malformed bytes become U+FFFD one byte at a time.
 * Non-UDA pairs use `lib/dic/cp950-table.ts` (verified vs iconv in tests).
 */
export function decodeCp950Astral(buf: Buffer): string {
  let out = "";
  let i = 0;
  while (i < buf.length) {
    const b = buf[i]!;
    if (b <= 0x80) {
      out += String.fromCharCode(b);
      i++;
      continue;
    }
    if (b === 0xff) {
      out += String.fromCodePoint(0xf00ff);
      i++;
      continue;
    }
    const t = i + 1 < buf.length ? buf[i + 1]! : -1;
    if (t >= 0 && isCp950TrailByte(t)) {
      out += isCp950UserDefinedPair(b, t)
        ? String.fromCodePoint(0xf0000 + ((b << 8) | t))
        : decodeCp950Pair(b, t);
      i += 2;
      continue;
    }
    out += "\uFFFD";
    i++;
  }
  return out;
}

/**
 * `recode_utf8.pl`: lowercase `~TAG;` print-control markers anywhere in a
 * line, dropping the spaces before a tag at line start.
 */
export function lowercaseTildeTags(str: string): string {
  return str.replace(/(^ +)?(~[A-Z][A-Z0-9]+;)/gm, (_m, _sp, tag: string) =>
    tag.toLowerCase(),
  );
}

/** `.dic`/appendix recode (port of `a-tsioh_sandbox/recode_utf8.pl`). */
export function recodeDicBuffer(buf: Buffer): string {
  return lowercaseTildeTags(decodeCp950Astral(buf));
}

/** File recode, byte-identical with the committed `pug/` provenance chain. */
export function recodeDicFile(dicPath: string): string {
  return recodeDicBuffer(readFileSync(dicPath));
}