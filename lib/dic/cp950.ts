import iconv from "iconv-lite";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

/** Decode a CP950 (Big5) file buffer to a JavaScript string. */
export function decodeCp950(buf: Buffer): string {
  return iconv.decode(buf, "cp950");
}

/**
 * Perl `recode_utf8.pl` / `remap_pua`: lowercase leading ~TAG; on BMP PUA
 * (U+E000–U+F8FF) re-encode via CP950 and lift to U+F0000 + hex(bytes).
 */
export function remapPua(str: string): string {
  let out = str.replace(/^(\s*)(~[A-Z][A-Z0-9]+;)/gm, (_, sp: string, tag: string) => {
    return `${sp}${tag.toLowerCase()}`;
  });
  out = out.replace(/[\uE000-\uF8FF]/g, (ch) => {
    const bytes = iconv.encode(ch, "cp950");
    let hex = 0;
    for (let i = 0; i < bytes.length; i++) hex = (hex << 8) + bytes[i]!;
    return String.fromCodePoint(0xf0000 + hex);
  });
  return out;
}

/** In-memory recode (iconv CP950). Vendor PE2 bytes may not match Perl Encode::CP950. */
export function recodeDicBuffer(buf: Buffer): string {
  return remapPua(decodeCp950(buf));
}

/**
 * File recode via legacy `recode_utf8.pl` (byte-identical with committed `pug/`).
 * TODO: port Microsoft CP950 vendor → BMP PUA mapping so this can be pure TS.
 */
export function recodeDicFile(root: string, dicPath: string): string {
  const script = join(root, "a-tsioh_sandbox/recode_utf8.pl");
  const result = spawnSync("perl", [script, dicPath], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `recode_utf8.pl failed (${result.status}): ${result.stderr?.slice(0, 500)}`,
    );
  }
  return result.stdout ?? "";
}