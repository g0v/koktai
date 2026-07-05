import type { LinkTarget } from "./linkify.ts";
import type { Corpus } from "./corpus.ts";
import { VOLUME_IDS } from "../dic/pipeline.ts";

/** Static URL for a dictionary volume hub (syllable index, no full body). */
export function volumeHubPath(vol: string): string {
  return `${vol}/index.html`;
}

/** Static URL for one syllable section (`build.format: "directory"` → `01/3/index.html`). */
export function volumeSectionPath(vol: string, section: number): string {
  return `${vol}/${section}/index.html`;
}

export function entryAnchor(k: "w" | "c", line: number): string {
  return k === "w" ? `w-${line}` : `c-${line}`;
}

/** Resolve 1-based section index for a cross-link target (0 = unknown → hub). */
export function sectionForTarget(corpus: Corpus, target: LinkTarget): number {
  const data = corpus.volumes.get(target.v);
  if (!data) return 0;
  if (target.k === "w") {
    const w = data.words.find((row) => row.line === target.l);
    return w ? corpus.sectionOf(target.v, w.chapterZhuyin) : 0;
  }
  const s = data.sinograms.find((row) => row.line === target.l);
  return s ? corpus.sectionOf(target.v, s.chapterZhuyin) : 0;
}

export function targetPageHref(
  hrefBase: string,
  target: LinkTarget,
  corpus: Corpus,
): string {
  const sec = sectionForTarget(corpus, target);
  const page =
    sec > 0 ? volumeSectionPath(target.v, sec) : volumeHubPath(target.v);
  return `${hrefBase}${page}#${entryAnchor(target.k, target.l)}`;
}

export interface SectionEntryIndex {
  /** `"01"` → `{ "w-42": 3, "c-100": 3 }` */
  volumes: Record<string, Record<string, number>>;
}

export function buildSectionEntryIndex(corpus: Corpus): SectionEntryIndex {
  const volumes: Record<string, Record<string, number>> = {};
  for (const vol of VOLUME_IDS) {
    const data = corpus.volumes.get(vol);
    if (!data) continue;
    const map: Record<string, number> = {};
    for (const w of data.words) {
      const sec = corpus.sectionOf(vol, w.chapterZhuyin);
      if (sec > 0) map[entryAnchor("w", w.line)] = sec;
    }
    for (const s of data.sinograms) {
      const sec = corpus.sectionOf(vol, s.chapterZhuyin);
      if (sec > 0) map[entryAnchor("c", s.line)] = sec;
    }
    volumes[vol] = map;
  }
  return { volumes };
}