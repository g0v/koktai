import { extractVolume } from "../extract/extract.ts";
import type { ExtractResult } from "../extract/extract.ts";
import { VOLUME_IDS } from "../dic/pipeline.ts";

let cache: { root: string; corpus: Corpus } | undefined;

export interface Corpus {
  volumes: Map<string, ExtractResult>;
  sectionOf(vol: string, chapterZhuyin: string): number;
}

function chapterSectionIndex(result: ExtractResult): Map<string, number> {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const w of result.words) {
    if (!seen.has(w.chapterZhuyin)) {
      seen.add(w.chapterZhuyin);
      order.push(w.chapterZhuyin);
    }
  }
  for (const s of result.sinograms) {
    if (!seen.has(s.chapterZhuyin)) {
      seen.add(s.chapterZhuyin);
      order.push(s.chapterZhuyin);
    }
  }
  const sections = new Map<string, number>();
  order.forEach((ch, i) => sections.set(ch, i + 1));
  return sections;
}

export function getCorpus(root: string): Corpus {
  if (cache?.root === root) return cache.corpus;
  const volumes = new Map<string, ExtractResult>();
  const sectionMaps = new Map<string, Map<string, number>>();
  for (const vol of VOLUME_IDS) {
    const result = extractVolume(root, vol);
    volumes.set(vol, result);
    sectionMaps.set(vol, chapterSectionIndex(result));
  }
  const corpus: Corpus = {
    volumes,
    sectionOf(vol, chapterZhuyin) {
      return sectionMaps.get(vol)?.get(chapterZhuyin) ?? 0;
    },
  };
  cache = { root, corpus };
  return corpus;
}
