import { extractVolume } from "../extract/extract.ts";
import type { Reading, Token, Usage, WordRecord, WordSense } from "../extract/types.ts";

export interface StructuredReading {
  zhuyin: string;
  register: string[];
  geo: string[];
  other: string[];
}

export type StructuredToken =
  | { kind: "syl"; han: string; readings: StructuredReading[] }
  | {
      kind: "variant";
      alternatives: StructuredToken[][];
      usages: { register: string[]; geo: string[]; other: string[] };
      text: string;
    }
  | { kind: "reading"; readings: StructuredReading[] }
  | { kind: "prose"; text: string };

export interface StructuredSense {
  nh: string;
  pos: string;
  taigi: StructuredToken[];
  mandarin: string[];
}

export interface StructuredEntry {
  line: number;
  headword: string;
  head: StructuredToken[];
  senses: StructuredSense[];
}

export interface StructuredSection {
  id: string;
  chapterZhuyin: string;
  entries: StructuredEntry[];
}

export interface StructuredVolume {
  base: string;
  entryCount: number;
  sections: StructuredSection[];
}

function bucketUsages(usages: Usage[]): { register: string[]; geo: string[]; other: string[] } {
  const register: string[] = [];
  const geo: string[] = [];
  const other: string[] = [];
  for (const u of usages) {
    switch (u.dim) {
      case "register":
        register.push(u.value);
        break;
      case "geo":
        geo.push(u.value);
        break;
      default:
        other.push(u.value);
        break;
    }
  }
  return { register, geo, other };
}

function bucketReading(r: Reading): StructuredReading {
  const register: string[] = [];
  const geo: string[] = [];
  const other: string[] = [];
  for (const u of r.usages) {
    switch (u.dim) {
      case "register":
        register.push(u.value);
        break;
      case "geo":
        geo.push(u.value);
        break;
      default:
        other.push(u.value);
        break;
    }
  }
  return { zhuyin: r.zhuyin, register, geo, other };
}

function tokenDisplayText(t: StructuredToken): string {
  switch (t.kind) {
    case "syl":
      return t.han;
    case "prose":
      return t.text;
    case "reading":
      return t.readings.map((r) => r.zhuyin).join("");
    case "variant":
      return t.text;
  }
}

function mapToken(t: Token): StructuredToken {
  switch (t.kind) {
    case "syl":
      return { kind: "syl", han: t.han, readings: t.readings.map(bucketReading) };
    case "variant": {
      const alternatives = t.alternatives.map((alt) => alt.map(mapToken));
      const text = alternatives.map((alt) => alt.map(tokenDisplayText).join("")).join("/");
      return { kind: "variant", alternatives, usages: bucketUsages(t.usages), text };
    }
    case "reading":
      return { kind: "reading", readings: t.readings.map(bucketReading) };
    case "prose":
      return { kind: "prose", text: t.text };
  }
}


function mapTokens(tokens: Token[]): StructuredToken[] {
  return tokens.map(mapToken);
}

function mapSense(s: WordSense): StructuredSense {
  return {
    nh: s.nh,
    pos: s.pos,
    taigi: mapTokens(s.taigi),
    mandarin: s.mandarin,
  };
}

function mapEntry(w: WordRecord): StructuredEntry {
  return {
    line: w.line,
    headword: w.headword,
    head: mapTokens(w.head),
    senses: w.senses.map(mapSense),
  };
}

export function getStructuredVolume(root: string, base: string): StructuredVolume {
  const { words } = extractVolume(root, base);
  const sectionOrder: string[] = [];
  const byChapter: Record<string, StructuredEntry[]> = {};
  for (const w of words) {
    const ch = w.chapterZhuyin;
    if (!byChapter[ch]) {
      byChapter[ch] = [];
      sectionOrder.push(ch);
    }
    byChapter[ch].push(mapEntry(w));
  }

  const sections: StructuredSection[] = sectionOrder.map((chapterZhuyin, i) => ({
    id: `s-${i + 1}`,
    chapterZhuyin,
    entries: byChapter[chapterZhuyin]!,
  }));

  return {
    base,
    entryCount: words.length,
    sections,
  };
}