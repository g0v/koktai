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

const TAIL_LEYU = /~fk;台類語~fm3;：/u;

function continuationTaigiAfterFirstSense(mainPart: string, tailPart: string, s: Syllables): Token[] {
  const segments = mainPart.split(/(?=\(台\))/u).filter((seg) => seg.startsWith("(台)"));
  const lastTai = segments.at(-1)?.replace(/^\(台\)/u, "") ?? "";
  const tail = tailPart.replace(TAIL_LEYU, "");
  const text = lastTai + tail;
  if (!text) return [];
  return tokenizeTaigi(normalizeTaigi(text, s), s);
}


export function parseWord(
  raw: RawWordLine,
  volume: string,
  chapterZhuyin: string,
  s: Syllables,
  root: string,
): WordRecord | null {
  const tailIdx = raw.text.search(TAIL_LEYU);
  const mainText = tailIdx >= 0 ? raw.text.slice(0, tailIdx) : raw.text;
  const tailText = tailIdx >= 0 ? raw.text.slice(tailIdx) : "";

  const entry = parseWordLine(mainText, root);
  if (!entry) return null;

  const head = tokenizeEntryHead(entry.entry, s);
  const headword = head.map((h) => h.han).join("") || headwordFromEntry(entry.entry, s);

  const mandarin = entry.sentences.filter((x) => x.lang === "國語").map((x) => x.sentence);
  const taigi = buildTaigiTokens(entry.sentences, s);

  const senses: WordSense[] = [
    {
      nh: entry.nh,
      pos: entry.POS,
      taigi,
      mandarin,
    },
  ];

  if (tailText) {
    const taigi2 = continuationTaigiAfterFirstSense(mainText, tailText, s);
    if (taigi2.length > 0) {
      senses.push({
        nh: String(Number(entry.nh) + 1),
        pos: entry.POS,
        taigi: taigi2,
        mandarin: [],
      });
    }
  }

  return {
    kind: "word",
    volume,
    line: raw.line,
    chapterZhuyin,
    headword,
    head,
    senses,
  };
}