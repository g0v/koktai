import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

let mappingCache: Record<string, string> | null = null;

export function loadPrivateMapping(root: string): Record<string, string> {
  if (mappingCache) return mappingCache;
  const path = join(root, "a-tsioh_sandbox/mapping.json");
  mappingCache = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  return mappingCache;
}

const RE_CHANGE_FONT = /~fk[a-z0-9]*;(.*?)~fm[37][a-z0-9]*;/gi;
const RE_SPECIAL = /~[a-z0-9]+(?:;|$)/gi;
const RE_FK = /<k>.*?<\/k>/gi;

export function stripPe2Tags(s: string): string {
  return s.replace(RE_SPECIAL, "");
}

export function wrapKaiFont(s: string): string {
  return s.replace(RE_CHANGE_FONT, "<k>$1</k>");
}

export function replacePrivates(s: string, mapping: Record<string, string>): string {
  let out = s;
  RE_FK.lastIndex = 0;
  let m = RE_FK.exec(out);
  while (m) {
    const begin = m.index;
    const end = begin + m[0].length;
    const chunk = out.slice(begin, end);
    const newContent = [...chunk]
      .map((c) => mapping[c] ?? c)
      .join("");
    out = out.slice(0, begin) + newContent + out.slice(end);
    RE_FK.lastIndex = begin + newContent.length;
    m = RE_FK.exec(out);
  }
  return out;
}

export function normalizePe2Line(s: string, mapping: Record<string, string>): string {
  return replacePrivates(wrapKaiFont(stripPe2Tags(s)), mapping);
}