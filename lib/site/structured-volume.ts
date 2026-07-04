import { extractVolume } from "../extract/extract.ts";
import type { Reading, Token, WordRecord, WordSense } from "../extract/types.ts";

export interface StructuredReading {
  zhuyin: string;
  register: string[];
  geo: string[];
  other: string[];
}

export interface StructuredToken {
  han: string;
  readings: StructuredReading[];
}

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

function mapToken(t: Token): StructuredToken | null {
  switch (t.kind) {
    case "syl":
      return { han: t.han, readings: t.readings.map(bucketReading) };
    case "variant":
      return null;
    case "reading":
      return { han: "", readings: t.readings.map(bucketReading) };
    case "prose":
      return { han: t.text, readings: [] };
    default:
      return null;
  }
}

function mapTokens(tokens: Token[]): StructuredToken[] {
  const out: StructuredToken[] = [];
  for (const t of tokens) {
    const mapped = mapToken(t);
    if (mapped) out.push(mapped);
  }
  return out;
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