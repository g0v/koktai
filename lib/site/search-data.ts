import { loadFontMaps } from "../dic/unescape.ts";
import type { Reading, SinogramEntry, Token, WordRecord } from "../extract/types.ts";
import { VOLUME_IDS } from "../dic/pipeline.ts";
import type { Corpus } from "./corpus.ts";

export type SuggestRow = [t: string, z: string, v: string, l: number, k: 0 | 1, s: number];

export type FulltextDoc = {
  t: string;
  v: string;
  l: number;
  k: 0 | 1;
  s: number;
  d: string;
};

const K_TAG = /<\/?k>/g;
const ASTRAL_PUA = /[\u{f0000}-\u{fffff}]/gu;
const fontMaps = loadFontMaps(process.cwd());

function puaCode(ch: string): string {
  return (ch.codePointAt(0)! - 0xf0000).toString(16).padStart(4, "0");
}

function plainPua(ch: string): string {
  const code = puaCode(ch);
  return fontMaps.m3Noruby[code] ?? fontMaps.m3[code] ?? fontMaps.k[code] ?? fontMaps.mapping[ch] ?? "□";
}

function legacyPlainText(text: string): string {
  let out = text;
  for (let i = 0; i < 8; i += 1) {
    ASTRAL_PUA.lastIndex = 0;
    if (!ASTRAL_PUA.test(out)) break;
    ASTRAL_PUA.lastIndex = 0;
    out = out.replace(ASTRAL_PUA, plainPua);
  }
  ASTRAL_PUA.lastIndex = 0;
  return out.replace(ASTRAL_PUA, "□");
}

export function stripHeadwordMarkup(t: string): string {
  return t.replace(K_TAG, "");
}

export function headZhuyinForWord(w: WordRecord): string {
  return w.head.flatMap((syl) => syl.readings.map((r) => r.zhuyin)).join(" ");
}

function tokenPlainText(t: Token): string {
  switch (t.kind) {
    case "syl":
      return t.han;
    case "prose":
      return t.text;
    case "reading":
      return t.readings.map((r) => r.zhuyin).join("");
    case "variant":
      return t.alternatives.map((alt) => alt.map(tokenPlainText).join("")).join("/");
  }
}

function wordFulltextBody(w: WordRecord): string {
  const parts: string[] = [headZhuyinForWord(w)];
  for (const sense of w.senses) {
    for (const line of sense.mandarin) {
      parts.push(legacyPlainText(stripHeadwordMarkup(line)));
    }
    for (const tok of sense.taigi) {
      parts.push(legacyPlainText(tokenPlainText(tok)));
    }
  }
  return parts.filter((p) => p.length > 0).join(" ");
}

function sinogramFulltextBody(s: SinogramEntry): string {
  const parts: string[] = [];
  if (s.fanqie) parts.push(legacyPlainText(s.fanqie));
  if (s.headZhuyin) parts.push(s.headZhuyin);
  for (const line of s.readingLines) {
    if (line.note) parts.push(legacyPlainText(line.note));
    parts.push(line.readings.map((r) => r.zhuyin).join(" "));
  }
  return parts.filter((p) => p.length > 0).join(" ");
}

function compareSuggestRows(a: SuggestRow, b: SuggestRow): number {
  const dLen = a[0].length - b[0].length;
  if (dLen !== 0) return dLen;
  const dVol = a[2].localeCompare(b[2]);
  if (dVol !== 0) return dVol;
  return a[3] - b[3];
}

export function buildSuggestRows(corpus: Corpus): SuggestRow[] {
  const rows: SuggestRow[] = [];
  for (const vol of VOLUME_IDS) {
    const result = corpus.volumes.get(vol);
    if (!result) continue;
    for (const w of result.words) {
      const s = corpus.sectionOf(vol, w.chapterZhuyin);
      rows.push([
        stripHeadwordMarkup(w.headword),
        headZhuyinForWord(w),
        vol,
        w.line,
        0,
        s,
      ]);
    }
    for (const g of result.sinograms) {
      const s = corpus.sectionOf(vol, g.chapterZhuyin);
      rows.push([
        g.han === "" ? "□" : g.han,
        g.headZhuyin ?? "",
        vol,
        g.line,
        1,
        s,
      ]);
    }
  }
  rows.sort(compareSuggestRows);
  return rows;
}

export function buildFulltextDocs(corpus: Corpus): FulltextDoc[] {
  const docs: FulltextDoc[] = [];
  for (const vol of VOLUME_IDS) {
    const result = corpus.volumes.get(vol);
    if (!result) continue;
    for (const w of result.words) {
      const s = corpus.sectionOf(vol, w.chapterZhuyin);
      docs.push({
        t: stripHeadwordMarkup(w.headword),
        v: vol,
        l: w.line,
        k: 0,
        s,
        d: wordFulltextBody(w),
      });
    }
    for (const g of result.sinograms) {
      const s = corpus.sectionOf(vol, g.chapterZhuyin);
      docs.push({
        t: g.han === "" ? "□" : g.han,
        v: vol,
        l: g.line,
        k: 1,
        s,
        d: sinogramFulltextBody(g),
      });
    }
  }
  return docs;
}