import iconv from "iconv-lite";
import { readFileSync } from "node:fs";

/** Decode a CP950 (Big5) file buffer to a JavaScript string. */
export function decodeCp950(buf: Buffer): string {
  return iconv.decode(buf, "cp950");
}

/** Valid CP950 trail byte: 0x40–0x7E or 0xA1–0xFE. */
function isTrailByte(b: number): boolean {
  return (b >= 0x40 && b <= 0x7e) || (b >= 0xa1 && b <= 0xfe);
}

/**
 * Big5 user-defined area (Encode::CP950 maps these pairs to U+E000–U+F8FF):
 * leads 0x81–0xA0 and 0xFA–0xFE (full trail range), plus 0xC6A1–0xC8FE.
 */
function isUserDefined(hi: number, lo: number): boolean {
  if (hi >= 0x81 && hi <= 0xa0) return true;
  if (hi >= 0xfa && hi <= 0xfe) return true;
  if (hi === 0xc6) return lo >= 0xa1;
  return hi === 0xc7 || hi === 0xc8;
}

/**
 * CP950 → string with user-defined codes lifted straight to U+F0000 + Big5
 * code — the composed effect of Perl Encode CP950's UDA→BMP-PUA mapping
 * followed by `remap_pua`'s re-encode in `recode_utf8.pl`. Byte 0x80 passes
 * through as U+0080 and lone 0xFF (CP950 single-byte UDA U+F8F8) lifts to
 * U+F00FF, matching Encode; malformed bytes become U+FFFD one byte at a time.
 * Verified byte-identical with the Perl output over every possible byte pair.
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
    if (t >= 0 && isTrailByte(t)) {
      out += isUserDefined(b, t)
        ? String.fromCodePoint(0xf0000 + ((b << 8) | t))
        : iconv.decode(buf.subarray(i, i + 2), "cp950");
      i += 2;
      continue;
    }
    out += "�";
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
