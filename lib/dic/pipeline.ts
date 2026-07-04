import { readdirSync } from "node:fs";
import { join } from "node:path";
import { recodeDicFile } from "./cp950.ts";
import { dicTextToPugBody } from "./dic2pug.ts";
import { txtTextToPugBody } from "./txt2pug.ts";
import { unescapeDocument } from "./unescape.ts";

export interface GeneratedPug {
  /** Final pug source written to `pug/<base>.pug`. */
  text: string;
}

/**
 * Full pipeline, pure TypeScript: CP950 file → committed-style pug document.
 * Stages: recode (`cp950.ts`) → analyse (`dic2pug.ts`) → unescape + finalize
 * (`unescape.ts`). Parity gate vs the committed corpus: `bun run diff:pug`.
 */
export function generatePugFromDicFile(
  root: string,
  dicPath: string,
): GeneratedPug {
  const recoded = recodeDicFile(dicPath);
  const pre = dicTextToPugBody(recoded, root);
  return { text: unescapeDocument(root, pre) };
}

/** Appendix / preface text file (CP950) → pug. */
export function generatePugFromTxtFile(
  root: string,
  txtPath: string,
): GeneratedPug {
  const utf8 = recodeDicFile(txtPath);
  const pre = txtTextToPugBody(utf8, root);
  return { text: unescapeDocument(root, pre) };
}

export const VOLUME_IDS = Array.from({ length: 26 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

/** Mirror `gen.pl`: `glob("*{vol}*.dic")` — first match after sort. */
export function resolveVolumeDic(root: string, vol: string): string {
  const matches = readdirSync(root)
    .filter((f) => f.endsWith(".dic") && f.includes(vol))
    .sort();
  if (matches.length === 0) throw new Error(`no .dic for volume ${vol}`);
  return join(root, matches[0]!);
}

export const APPENDIX_SOURCES = [
  "dic-cont.txt",
  "ph-comp.txt",
  "phsource",
  "preface1.dic",
  "mytaiin8.txt",
] as const;

export function appendixOutputBase(source: string): string {
  return source.replace(/\.[^.]+$/, "");
}
