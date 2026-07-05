import type { SuggestRow } from "./protocol.ts";

const TONE_MARKS = /[ˊˇˋ˙\s]/g;

export function stripTone(z: string): string {
  return z.replace(TONE_MARKS, "");
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function highlightMatch(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return escapeHtml(text);
  const before = text.slice(0, idx);
  const hit = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return `${escapeHtml(before)}<mark>${escapeHtml(hit)}</mark>${escapeHtml(after)}`;
}

const VOL_NUMERALS = [
  "〇", "一", "二", "三", "四", "五", "六", "七", "八", "九",
] as const;

export function formatVolumeLabel(vol: string): string {
  const n = Number.parseInt(vol, 10);
  if (!Number.isFinite(n) || n < 0 || n > 99) return `卷${vol}`;
  if (n < 10) return `卷${VOL_NUMERALS[n]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 1 ? "十" : `${VOL_NUMERALS[tens]}十`;
  return ones === 0 ? `卷${tensPart}` : `卷${tensPart}${VOL_NUMERALS[ones]}`;
}

export function entryAnchor(k: 0 | 1, line: number): string {
  return k === 1 ? `#c-${line}` : `#w-${line}`;
}

export function entryHref(
  base: string,
  vol: string,
  k: 0 | 1,
  line: number,
  section: number,
): string {
  const b = base.endsWith("/") ? base : `${base}/`;
  const anchor = entryAnchor(k, line);
  return `${b}${vol}/${section}/index.html${anchor}`;
}

type MatchTier = 0 | 1 | 2 | 3 | 4 | 5;

function matchTier(row: SuggestRow, q: string, qz: string): MatchTier | null {
  const [t, z] = row;
  const zPlain = stripTone(z);
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  if (qz && zPlain.startsWith(qz)) return 3;
  if (qz && zPlain.includes(qz)) return 4;
  return null;
}

function compareRows(a: SuggestRow, b: SuggestRow): number {
  const dLen = a[0].length - b[0].length;
  if (dLen !== 0) return dLen;
  const dVol = a[2].localeCompare(b[2]);
  if (dVol !== 0) return dVol;
  return a[3] - b[3];
}

export function rankSuggestRows(
  rows: SuggestRow[],
  query: string,
  limit = 40,
): SuggestRow[] {
  const q = query.trim();
  if (!q) return [];
  const qz = stripTone(q);
  const buckets: SuggestRow[][] = [[], [], [], [], [], []];
  for (const row of rows) {
    const tier = matchTier(row, q, qz);
    if (tier !== null) buckets[tier]!.push(row);
  }
  const out: SuggestRow[] = [];
  for (const bucket of buckets) {
    bucket.sort(compareRows);
    for (const row of bucket) {
      out.push(row);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function buildSnippetAround(
  text: string,
  start: number,
  end: number,
  radius = 40,
): string {
  const left = Math.max(0, start - radius);
  const right = Math.min(text.length, end + radius);
  const prefix = left > 0 ? "…" : "";
  const suffix = right < text.length ? "…" : "";
  const before = escapeHtml(text.slice(left, start));
  const hit = escapeHtml(text.slice(start, end));
  const after = escapeHtml(text.slice(end, right));
  return `${prefix}${before}<mark>${hit}</mark>${after}${suffix}`;
}