import { legacyPlainText, renderLegacyText } from "./legacy-text.ts";
import type { Reading, SinogramEntry, Token, WordRecord } from "../extract/types.ts";
import { VOLUME_IDS } from "../dic/pipeline.ts";
import type { Corpus } from "./corpus.ts";


export type SuggestRow = [t: string, z: string, v: string, l: number, k: 0 | 1, s: number, h?: string];

export type FulltextDoc = {
  t: string;
  v: string;
  l: number;
  k: 0 | 1;
  s: number;
  d: string;
};

export type FulltextRow = [t: string, v: string, l: number, k: 0 | 1, d: string];

const PHONETIC_RE = /[\u3100-\u312f\u31a0-\u31bfˊˇˋ˙̇˫]+/g;
const SPACE_RE = /\s+/g;

function stripWordBodyPhonetics(text: string): string {
  return text.replace(PHONETIC_RE, "").replace(SPACE_RE, " ").trim();
}

const K_TAG = /<\/?k>/g;

export function stripHeadwordMarkup(t: string): string {
  return t.replace(K_TAG, "");
}

function headwordFields(raw: string): { text: string; html?: string } {
  const stripped = stripHeadwordMarkup(raw);
  const text = legacyPlainText(stripped);
  const html = renderLegacyText(stripped);
  return html.includes("<img") ? { text, html } : { text };
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
      const head = headwordFields(w.headword);
      const s = corpus.sectionOf(vol, w.chapterZhuyin);
      const row: SuggestRow = [
        head.text,
        headZhuyinForWord(w),
        vol,
        w.line,
        0,
        s,
      ];
      if (head.html) row.push(head.html);
      rows.push(row);
    }
    for (const g of result.sinograms) {
      const head = g.han === "" ? { text: "□" } : headwordFields(g.han);
      const s = corpus.sectionOf(vol, g.chapterZhuyin);
      const row: SuggestRow = [
        head.text,
        g.headZhuyin ?? "",
        vol,
        g.line,
        1,
        s,
      ];
      if (head.html) row.push(head.html);
      rows.push(row);
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
        t: legacyPlainText(stripHeadwordMarkup(w.headword)),
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
        t: g.han === "" ? "□" : legacyPlainText(g.han),
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

export function buildFulltextRows(corpus: Corpus): FulltextRow[] {
  return buildFulltextDocs(corpus).map((doc) => [
    doc.t,
    doc.v,
    doc.l,
    doc.k,
    doc.k === 0 ? stripWordBodyPhonetics(doc.d) : doc.d,
  ]);
}