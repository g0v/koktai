import { parseWordLine } from "../dic/analyse/word.ts";
import type { RawWordLine } from "./blocks.ts";
import { normalizeTaigi } from "./normalize.ts";
import { classifyPua, isPua } from "./syllables.ts";
import { tokenizeTaigi } from "./tokenize.ts";
import type { HanSyllable, Syllables, Token, WordRecord, WordSense } from "./types.ts";

const HAN = /\p{Script=Han}/u;

function zyFromEntryPua(ch: string, s: Syllables): string | null {
  const cl = classifyPua(ch, s);
  if (cl.type === "reading" || cl.type === "kReading") return cl.zhuyin;
  return null;
}

/** Drop trailing reading PUAs and `<k>` reading runs from entry text for display han only. */
function headwordFromEntry(entry: string, s: Syllables): string {
  const chars = [...entry];
  const hans: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i]!;
    if (ch === "<" && entry.slice(i).startsWith("<k>")) {
      const close = entry.indexOf("</k>", i);
      if (close < 0) break;
      const inner = entry.slice(i + 3, close);
      i = close + 4;
      if ([...inner].every((c) => isPua(c) && zyFromEntryPua(c, s))) continue;
      hans.push(`<k>${inner}</k>`);
      continue;
    }
    if (isPua(ch) && zyFromEntryPua(ch, s)) {
      i += ch.length;
      continue;
    }
    if (HAN.test(ch) || ch === "～") hans.push(ch);
    i += ch.length;
  }
  return hans.join("");
}

function tokenizeEntryHead(entry: string, s: Syllables): HanSyllable[] {
  const norm = normalizeTaigi(entry, s);
  return tokenizeTaigi(norm, s).filter((t): t is HanSyllable => t.kind === "syl");
}

function inlineTaigiFromMandarin(sentence: string): string | null {
  const m = sentence.match(/\(台\)(.+)$/u);
  return m ? m[1]! : null;
}

function buildTaigiTokens(sentences: { lang: string; sentence: string }[], s: Syllables): Token[] {
  const out: Token[] = [];
  for (const sent of sentences) {
    if (sent.lang === "台") {
      out.push(...tokenizeTaigi(normalizeTaigi(sent.sentence, s), s));
    } else if (sent.lang === "國語") {
      const tail = inlineTaigiFromMandarin(sent.sentence);
      if (tail) out.push(...tokenizeTaigi(normalizeTaigi(tail, s), s));
    }
  }
  return out;
}

export function parseWord(
  raw: RawWordLine,
  volume: string,
  chapterZhuyin: string,
  s: Syllables,
  root: string,
): WordRecord | null {
  const entry = parseWordLine(raw.text, root);
  if (!entry) return null;

  const head = tokenizeEntryHead(entry.entry, s);
  const headword = head.map((h) => h.han).join("") || headwordFromEntry(entry.entry, s);

  const mandarin = entry.sentences.filter((x) => x.lang === "國語").map((x) => x.sentence);
  const taigi = buildTaigiTokens(entry.sentences, s);

  const sense: WordSense = {
    nh: entry.nh,
    pos: entry.POS,
    taigi,
    mandarin,
  };

  return {
    kind: "word",
    volume,
    line: raw.line,
    chapterZhuyin,
    headword,
    head,
    senses: [sense],
  };
}