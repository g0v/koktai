import type { Syllables } from "./types.ts";
import { puaHex } from "./syllables.ts";

const BOPO = /^[\u3105-\u312f\u31a0-\u31bf\u02d9\u02ca\u02c7\u02cb\u02ea\u02eb\u0307\s]+$/u;
const K_TAG = /<k>([\u{F0000}-\u{FFFFF}])<\/k>/gu;
const PAREN_ONE_READING = /\(\/([\u{F0000}-\u{FFFFF}])\)/gu;
const STRIP_VARIANT_WITH_READING = /\(\/[^()]*[\u{F0000}-\u{FFFFF}][^()]*\)/gu;


function dropLastCodePoint(s: string): string {
  const cps = [...s];
  cps.pop();
  return cps.join("");
}
function circledDigits(text: string): string {
  return [...text]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      if (cp >= 0xfc6a1 && cp <= 0xfc6a9) {
        return String.fromCodePoint(0x245f + (cp - 0xfc6a0));
      }
      return ch;
    })
    .join("");
}

function swapKTags(text: string, s: Syllables): string {
  return text.replace(K_TAG, (_m, pua: string) => {
    const hex = puaHex(pua);
    const kVal = s.k[hex];
    if (kVal === undefined || !BOPO.test(kVal)) return `<k>${pua}</k>`;
    const m3Hex =
      s.m3Reverse[kVal] ?? (kVal.startsWith("˙") ? s.m3Reverse[kVal.slice(1)] : undefined);
    if (m3Hex === undefined) return `<k>${pua}</k>`;
    return String.fromCodePoint(0xf0000 + Number.parseInt(m3Hex, 16));
  });
}

function unwrapReadingParens(text: string, s: Syllables): string {
  return text.replace(PAREN_ONE_READING, (full, pua: string) => {
    const hex = puaHex(pua);
    if (s.m3[hex] === undefined) return full;
    return `/${pua}`;
  });
}

function isM3ReadingCp(cp: number, s: Syllables): boolean {
  if (cp < 0xf0000 || cp > 0xfffff) return false;
  const hex = (cp - 0xf0000).toString(16).padStart(4, "0");
  return s.m3[hex] !== undefined;
}

/** Right-to-left syllable pairs before `end` (exclusive), like 分漢字注音.分一逝. */
function hanReadingPairsBefore(
  text: string,
  end: number,
  s: Syllables,
): { hans: string[]; reading: string }[] {
  const stripped = text.slice(0, end).replace(STRIP_VARIANT_WITH_READING, "");
  const chars = [...stripped];
  const pairs: { hans: string[]; reading: string }[] = [];
  let ci = chars.length;
  while (ci > 0) {
    ci--;
    const cp = chars[ci]!.codePointAt(0)!;
    if (!isM3ReadingCp(cp, s)) continue;
    let matched = false;
    for (let start = 0; start <= ci; start++) {
      const piece = splitOneSyllable(chars.slice(start, ci + 1).join(""));
      if (piece) {
        pairs.push(piece);
        ci = start;
        matched = true;
        break;
      }
    }
    if (!matched) continue;
  }
  return pairs.reverse();
}

function splitOneSyllable(segment: string): { hans: string[]; reading: string } | null {
  const segChars = [...segment];
  const readings: string[] = [];
  let end = segChars.length;
  while (end > 0) {
    const ch = segChars[end - 1]!;
    const cp = ch.codePointAt(0)!;
    if (cp < 0xf0000 || cp > 0xfffff) break;
    readings.unshift(ch);
    end--;
  }
  let rest = segChars.slice(0, end).join("");
  if (readings.length === 0) return null;
  while (rest.endsWith("/")) rest = rest.slice(0, -1);
  const hanParts: string[] = [];
  while (rest.endsWith(")")) {
    const open = rest.lastIndexOf("(");
    if (open < 0) return null;
    const inner = rest.slice(open + 1, -1).replace(/^\/+|\/+$/g, "").trim();
    let hasReading = false;
    for (const c of inner) {
      const cp = c.codePointAt(0)!;
      if (cp >= 0xf0000 && cp <= 0xfffff) {
        hasReading = true;
        break;
      }
    }
    if (inner && !hasReading) hanParts.push(inner);
    rest = rest.slice(0, open);
  }
  if (rest) {
    let han = rest;
    if (han.startsWith("<k>") && han.endsWith("</k>")) han = han.slice(3, -4);
    hanParts.push(han);
  }
  const bases = hanParts.reverse();
  if (bases.length === 0) return null;
  for (const b of bases) {
    if ([...b].length > 1) return null;
  }
  return { hans: bases, reading: readings[readings.length - 1]! };
}

function completeArrows(text: string, s: Syllables): string {
  let out = text;
  const chars = [...out];
  let ci = chars.length;
  let iterations = 0;
  while (ci > 0 && iterations++ < chars.length * 4 + 20) {
    ci--;
    if (chars[ci] !== "→") continue;
    const arrowStart = chars.slice(0, ci).join("").length;
    let n = 1;
    while (ci + n < chars.length) {
      const cp = chars[ci + n]!.codePointAt(0)!;
      if (!isM3ReadingCp(cp, s)) break;
      n++;
    }
    n--;
    if (n === 0) continue;

    const unitRe = /(?:<k>.*?<\/k>|[^\u{F0000}-\u{FFFFF}])+[\u{F0000}-\u{FFFFF}]/gu;
    const prefix = out.slice(0, arrowStart);
    const unitMatches = [...prefix.matchAll(unitRe)];
    if (unitMatches.length < n) continue;
    const regionStart = unitMatches[unitMatches.length - n]!.index!;
    const pairs = hanReadingPairsBefore(out, arrowStart, s);
    if (pairs.length < n) continue;
    const lastN = pairs.slice(-n);
    const bases = lastN.flatMap((p) => p.hans);
    const escaped = bases.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const expr = new RegExp(`(${escaped.join(".*")})`, "u");
    const region = out.slice(regionStart, arrowStart);
    const baseMatch = expr.exec(region);
    if (!baseMatch) continue;
    const splitStart = regionStart + baseMatch.index;

    const tail = out.slice(splitStart, arrowStart);
    const units = tail.match(unitRe);
    if (!units || units.length < n) continue;

    const arrowEnd = chars.slice(0, ci + 1).join("").length;
    const afterStart = chars.slice(0, ci + 1 + n).join("").length;
    const chunks: string[] = [out.slice(0, arrowEnd)];
    for (let k = 0; k < n; k++) {
      const unit = units[k]!;
      const reading = chars[ci + 1 + k]!;
      const fallbackBase = lastN[k]?.hans.filter((h) => !h.includes("→")).at(-1) ?? bases.filter((h) => !h.includes("→")).at(-1);
      let base = (unit.includes("</k>") && fallbackBase) || unit.includes("→") && fallbackBase ? fallbackBase : dropLastCodePoint(unit);
      if (base.includes("→")) base = bases.find((h) => !h.includes("→")) ?? base.replaceAll("→", "");
      chunks.push(base);
      chunks.push(reading);
    }
    chunks.push(out.slice(afterStart));
    const next = chunks.join("");
    if (next === out) continue;
    out = next;
    chars.length = 0;
    chars.push(...out);
    ci = chars.length;
  }
  return out;
}

/** Port of han2edu 臺文格式正規化 with circled-digit pass prepended. */
export function normalizeTaigi(text: string, s: Syllables): string {
  let t = swapKTags(circledDigits(text), s);
  t = completeArrows(t, s);
  t = unwrapReadingParens(t, s);
  return t;
}