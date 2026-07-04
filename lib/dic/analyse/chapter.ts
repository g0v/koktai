import type { ChapterEntry } from "../types.ts";
import { normalizePe2Line, wrapKaiFont, stripPe2Tags, replacePrivates } from "../pe2-text.ts";

const RE_MAIN = /^(?<entry>.*)~t112(?:fd0)?;(?<zhuyin2>\[[^\]]+\])?(?<body>.*)$/i;

export function parseChapterLine(line: string, mapping: Record<string, string>): ChapterEntry | null {
  const m = line.match(RE_MAIN);
  if (!m?.groups) return null;
  let entry = wrapKaiFont(m.groups.entry ?? "");
  let zhuyin2 = wrapKaiFont(m.groups.zhuyin2 ?? "");
  let body = wrapKaiFont(m.groups.body ?? "");
  entry = stripPe2Tags(entry);
  zhuyin2 = stripPe2Tags(zhuyin2);
  body = stripPe2Tags(body);
  const notes = body ? body.split(/\r?\n/).filter(Boolean) : [];
  const notesNorm = notes.map((n) => normalizePe2Line(n, mapping).trim());
  return {
    entry: replacePrivates(entry, mapping),
    zhuyin2: replacePrivates(zhuyin2, mapping),
    body: replacePrivates(body, mapping),
    notes: notesNorm,
  };
}

export function htmlOfChapter(entry: ChapterEntry): string {
  // Match `scripts/legacy-py3/analyse_chapter.py` `html_of_entry` (`.rstrip()` on template, not h2 field trim).
  let html = `    div\n      h2 ${entry.entry} ${entry.zhuyin2}`;
  for (const n of entry.notes) {
    if (n) html += `\n      dd ${n}`;
  }
  return html;
}