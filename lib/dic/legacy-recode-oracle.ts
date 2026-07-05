/**
 * Shared recode for parity / debug scripts. Production uses `recodeDicFile` in `cp950.ts`
 * (vendor CP950 table + U+F0000 astral lift + tilde tags — no Perl).
 */
import { readFileSync } from "node:fs";
import { recodeDicBuffer } from "./cp950.ts";

/** UTF-8 text after the same transform as `recodeDicFile(path)`. */
export function recodeDicPathToUtf8(dicPath: string): string {
  return recodeDicBuffer(readFileSync(dicPath));
}