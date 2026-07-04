import { readdirSync } from "node:fs";
import { join } from "node:path";
import { recodeDicFile } from "./cp950.ts";
import { dicTextToPugBody } from "./dic2pug.ts";
import { py3PreFromDicText } from "./legacy-py3.ts";
import { defaultPipelineMode } from "./stages.ts";
import type { PipelineMode } from "./stages.ts";
import { txtTextToPugBody } from "./txt2pug.ts";
import { perlUnescapeDocument } from "./unescape.ts";

export { defaultPipelineMode };

export interface GeneratedPug {
  /** Final pug source written to `pug/<base>.pug`. */
  text: string;
}

function runRecode(root: string, dicPath: string, mode: PipelineMode): string {
  return recodeDicFile(root, dicPath); // shadow/ts added in Phase 3
}

function runAnalyse(root: string, recoded: string, mode: PipelineMode): string {
  if (mode.analyse === "ts") {
    return dicTextToPugBody(recoded, root);
  }
  return py3PreFromDicText(root, recoded);
}

function runUnescape(root: string, pre: string, mode: PipelineMode): string {
  return perlUnescapeDocument(root, pre); // shadow/ts added in Phase 4
}

/**
 * Full pipeline: CP950 file → committed-style pug document.
 * Default: Perl recode → TS analyse (`dic2pug.ts`) → Perl jade-unescape → finalize (TS).
 * Legacy py3 analyse via `py3PreFromDicText` when `mode.analyse === "legacy"` (parity oracle).
 */
export function generatePugFromDicFile(
  root: string,
  dicPath: string,
  mode: PipelineMode = defaultPipelineMode,
): GeneratedPug {
  const recoded = runRecode(root, dicPath, mode);
  const pre = runAnalyse(root, recoded, mode);
  const text = runUnescape(root, pre, mode);
  return { text };
}

/** Appendix / preface text file (CP950) → pug. */
export function generatePugFromTxtFile(
  root: string,
  txtPath: string,
  mode: PipelineMode = defaultPipelineMode,
): GeneratedPug {
  const utf8 = runRecode(root, txtPath, mode);
  const pre = txtTextToPugBody(utf8, root);
  const text = runUnescape(root, pre, mode);
  return { text };
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