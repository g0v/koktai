import { stripPe2Tags } from "../dic/pe2-text.ts";
import type { RawSinogramBlock } from "./blocks.ts";
import { classifyLabel } from "./labels.ts";
import { classifyPua, isPua } from "./syllables.ts";
import type { Reading, ReadingLine, SinogramEntry, Syllables, Usage } from "./types.ts";

const CHAR_LINE = /^~(?:fm7|fk|fm3)t168/;
const READING_SOURCE = /^~fm7;([^~]+)/;

const PUNCT_ONLY = /^[\s，。、；：「」（）∥]+$/u;

const BODY_TOKEN =
  /\([^()]*\)|[\u{f0000}-\u{fffff}]|\/|[^()／/\u{f0000}-\u{fffff}]+/gu;

function readingZhuyin(ch: string, s: Syllables): string | null {
  const c = classifyPua(ch, s);
  if (c.type === "reading" || c.type === "kReading") return c.zhuyin;
  return null;
}

function parseCharLine(charLine: string, s: Syllables): {
  han: string;
  headZhuyin: string | null;
  fanqie: string | null;
} {
  const stripped = stripPe2Tags(charLine);
  const m = stripped.match(CHAR_LINE);
  const rest = m ? stripped.slice(m[0].length) : stripped;
  let han = "";
  let headZhuyin: string | null = null;
  let fanqie: string | null = null;
  let i = 0;
  while (i < rest.length) {
    const cp = rest.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    i += ch.length;
    if (isPua(ch)) {
      const zy = readingZhuyin(ch, s);
      if (zy && headZhuyin === null) {
        headZhuyin = zy;
        continue;
      }
      break;
    }
    if (ch === "\u3000") {
      fanqie = rest.slice(i).trim() || null;
      break;
    }
    if (!han) han = ch;
    else break;
  }
  return { han, headZhuyin, fanqie };
}

function extractReadingBody(raw: string): { source: string; body: string } {
  const sourceM = raw.match(READING_SOURCE);
  const source = sourceM?.[1]?.trim() ?? "";
  const afterSource = sourceM ? raw.slice(sourceM[0].length) : raw;
  let body = stripPe2Tags(afterSource).trim();
  body = body.replace(/[∥。]+$/u, "").trim();
  return { source, body };
}

function labelGroupIsRegisterOnly(usages: Usage[]): boolean {
  return usages.length > 0 && usages.every((u) => u.dim === "register");
}

function parseReadingBody(
  body: string,
  s: Syllables,
): { readings: Reading[]; note: string | null; parsed: boolean } {
  const readings: Reading[] = [];
  const noteParts: string[] = [];
  let pendingPrefix: Usage[] = [];
  let lastWasReading = false;
  let lastReading: Reading | null = null;

  const tokens: { kind: "label" | "reading" | "slash" | "prose"; text: string }[] = [];
  BODY_TOKEN.lastIndex = 0;
  let tm = BODY_TOKEN.exec(body);
  while (tm) {
    const t = tm[0];
    if (t === "/") tokens.push({ kind: "slash", text: t });
    else if (t.startsWith("(") && t.endsWith(")")) tokens.push({ kind: "label", text: t.slice(1, -1) });
    else if (t.length === 1 || (t.codePointAt(0)! >= 0xf0000 && t.codePointAt(0)! <= 0xfffff)) {
      if (readingZhuyin(t, s)) tokens.push({ kind: "reading", text: t });
      else tokens.push({ kind: "prose", text: t });
    } else tokens.push({ kind: "prose", text: t });
    tm = BODY_TOKEN.exec(body);
  }

  for (const tok of tokens) {
    if (tok.kind === "slash") {
      lastWasReading = false;
      continue;
    }
    if (tok.kind === "label") {
      const usages = classifyLabel(tok.text);
      if (usages === null) {
        noteParts.push(`(${tok.text})`);
        lastWasReading = false;
        continue;
      }
      if (labelGroupIsRegisterOnly(usages)) {
        pendingPrefix = [...usages];
      } else if (lastWasReading && lastReading) {
        lastReading.usages.push(...usages);
      } else {
        pendingPrefix = [...usages];
      }
      lastWasReading = false;
      continue;
    }
    if (tok.kind === "reading") {
      const zy = readingZhuyin(tok.text, s)!;
      const r: Reading = { zhuyin: zy, usages: [...pendingPrefix] };
      readings.push(r);
      lastReading = r;
      lastWasReading = true;
      continue;
    }
    const prose = tok.text.trim();
    if (prose && !PUNCT_ONLY.test(prose)) noteParts.push(tok.text);
    lastWasReading = false;
  }

  const note = noteParts.join("").trim() || null;
  if (readings.length === 0) {
    return { readings: [], note: body || null, parsed: false };
  }
  return { readings, note, parsed: true };
}

function parseReadingLine(
  lineNo: number,
  raw: string,
  s: Syllables,
): ReadingLine {
  const { source, body } = extractReadingBody(raw);
  const { readings, note, parsed } = parseReadingBody(body, s);
  if (!parsed) {
    return {
      line: lineNo,
      source,
      readings: [],
      note: body || stripPe2Tags(raw),
      raw,
      parsed: false,
    };
  }
  return { line: lineNo, source, readings, note, raw, parsed: true };
}

export function parseSinogram(
  block: RawSinogramBlock,
  volume: string,
  chapterZhuyin: string,
  s: Syllables,
): SinogramEntry {
  const { han, headZhuyin, fanqie } = parseCharLine(block.charLine, s);
  const readingLines = block.readingLines.map((rl) =>
    parseReadingLine(rl.line, rl.text, s),
  );
  return {
    kind: "sinogram",
    volume,
    line: block.line,
    chapterZhuyin,
    han,
    headZhuyin,
    fanqie,
    readingLines,
  };
}