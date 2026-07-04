import type { LanguageSentence, WordEntry } from "../types.ts";
import {
  wrapKaiFont,
  stripPe2Tags,
  replacePrivates,
  loadPrivateMapping,
} from "../pe2-text.ts";

const RE_MAIN = /^~t96;【(?<entry>[^】]+)】~(?:fd6)?t84;(?<definition>.*)$/iu;
const RE_DEFINITION = /^(?<nhomonym>[0-9]+ )?(?<POS>\[[^\]]+\])?(?<body>.*)$/u;

function isCjkLike(char: string): boolean {
  try {
    return /\p{Script=Han}/u.test(char);
  } catch {
    return false;
  }
}

function isBopomofo(char: string): boolean {
  const cp = char.codePointAt(0)!;
  return cp >= 0x3105 && cp <= 0x31ba;
}

function sentencePrefix(sentence: string, maxChars: number): string {
  return [...sentence].slice(0, maxChars).join("");
}

export function confirmTaigi(sentence: string): boolean {
  const chars = [...sentence];
  for (let i = 0; i < chars.length - 1; i++) {
    try {
      const char = chars[i]!;
      if (!isCjkLike(char)) continue;
      const next = chars[i + 1]!;
      const nextCp = next.codePointAt(0)!;
      if (nextCp >= 0xf0000 && nextCp <= 0xfffff) continue;
            if (!isBopomofo(next) && next !== "<" && next !== ")") return false;
    } catch {
      continue;
    }
  }
  return true;
}

export function splitByLanguage(definition: string): LanguageSentence[] {
  const sentences: LanguageSentence[] = [];
  let currentLanguage: "國語" | "台" = "國語";
  const chunks = definition.split("。");
  for (let i = 0; i < chunks.length; i++) {
    let sentence = chunks[i]!;
    if (sentence.length === 0) continue;
    if (i < chunks.length - 1) sentence += "。";
    if (sentencePrefix(sentence, 5).includes("(台)")) {
      sentence = sentence.replace("(台)", "");
      currentLanguage = "台";
    }
    if (sentencePrefix(sentence, 6).includes("(國語)")) {
      sentence = sentence.replace("(國語)", "");
      currentLanguage = "國語";
    }
    if (currentLanguage === "台" && !confirmTaigi(sentence)) {
      currentLanguage = "國語";
    }
    const last = sentences.at(-1);
    if (last && last.lang === currentLanguage) {
      last.sentence += sentence;
    } else {
      sentences.push({ lang: currentLanguage, sentence });
    }
  }
  return sentences;
}

export function parseWordLine(line: string, root: string): WordEntry | null {
  const mapping = loadPrivateMapping(root);
  const m = line.match(RE_MAIN);
  if (!m?.groups) return null;
  let entry = wrapKaiFont(m.groups.entry ?? "");
  let definition = wrapKaiFont(m.groups.definition ?? "");
  entry = stripPe2Tags(entry);
  definition = stripPe2Tags(definition);
  const defM = definition.match(RE_DEFINITION);
  if (!defM?.groups) return null;
  let nh = defM.groups.nhomonym?.trim() ?? "1";
  if (!defM.groups.nhomonym) nh = "1";
  const pos = defM.groups.POS ?? "None";
  const body = defM.groups.body ?? "";
  const sentences = splitByLanguage(body);
  for (const s of sentences) {
    s.sentence = replacePrivates(s.sentence, mapping);
  }
  return {
    entry: replacePrivates(entry, mapping),
    nh,
    POS: pos,
    body: replacePrivates(body, mapping),
    sentences,
  };
}

export function htmlOfWord(entry: WordEntry): string {
  let html = `    div\n      h3 ${entry.entry}\n      dl\n        dd ${entry.POS}`;
  for (const s of entry.sentences) {
    html += `\n        dd\n          u ${s.lang}`;
    html += `\n        dd ${s.sentence}`;
  }
  return html;
}