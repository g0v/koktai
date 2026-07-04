import {
  readdirSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import pug from "pug";

export const PUG_DIR = "pug";

export function listPugPages(root: string): string[] {
  const pugDir = join(root, PUG_DIR);
  return readdirSync(pugDir)
    .filter((f) => f.endsWith(".pug") && !f.startsWith("_"))
    .map((f) => f.replace(/\.pug$/, ""));
}

/** The pug/ corpus is generated output (.dic → `lib/dic/` TS pipeline → pug-syntax files);
 *  Pug 3 compiles it directly. Verified equivalent to Jade 1.11 (2026-07-04). */
export function compilePugFile(root: string, base: string): string {
  const pugDir = join(root, PUG_DIR);
  const src = join(pugDir, `${base}.pug`);
  return pug.compileFile(src, { basedir: pugDir, filename: src })();
}

/** Corpus pages are full HTML documents; Astro layout supplies shell. */
export function extractBodyInner(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1].trim() : html;
}

/* ── Volume enrichment ─────────────────────────────────────────────────── */

export interface SectionInfo {
  id: string;
  syllable: string;
  roman: string;
}

export interface VolumeData {
  html: string;
  sections: SectionInfo[];
  entries: number;
}

function horizontalI(s: string): string {
  return s.replaceAll("丨", "ㄧ");
}

function splitHead(raw: string): { syllable: string; roman: string } {
  const text = horizontalI(raw.replace(/<[^>]+>/g, "").trim());
  const m = text.match(/^(.*?)\s*\[(.*?)\]\s*$/s);
  return m
    ? { syllable: m[1].trim(), roman: m[2].trim() }
    : { syllable: text, roman: "" };
}

function classifyChunk(chunk: string): string {
  return chunk
    .replace(/<div>(\s*)<h3/g, '<div class="entry">$1<h3')
    .replace(
      /<dd>(\s*)<u>國語<\/u>(\s*)<\/dd>/g,
      '<dd class="lbl">$1<u class="lg lg-m">華語</u>$2</dd>',
    )
    .replace(/<u>國語<\/u>/g, '<u class="lg lg-m">華語</u>')
    .replace(
      /<dd>(\s*)<u>台<\/u>(\s*)<\/dd>/g,
      '<dd class="lbl">$1<u class="lg lg-t">台</u>$2</dd>',
    )
    .replace(/<dd>(\[[^\]<]{1,12}\])<\/dd>/g, '<dd class="pos">$1</dd>')
    .replace(/<rt>([\s\S]*?)<\/rt>/g, (_m, inner: string) => {
      const text = horizontalI(inner);
      const len = text
        .replace(/<[^>]+>/g, "")
        .replace(/&[a-z]+;/g, "")
        .trim().length;
      return len > 5 ? `<rt class="rt-l">${text}</rt>` : `<rt>${text}</rt>`;
    });
}

export function wrapPe2Directives(html: string): string {
  return html.replace(
    /^(\s*)(\.[A-Z]{2}[^\n<]*)$/gm,
    '$1<span class="pe2">$2</span>',
  );
}

export function transformVolume(bodyInner: string): VolumeData {
  const parts = bodyInner.split(
    /<div>\s*<h2>([\s\S]*?)<\/h2>([\s\S]*?)<\/div>/,
  );
  const sections: SectionInfo[] = [];
  let out = "";
  if (parts[0].trim()) out += classifyChunk(parts[0]);
  for (let i = 1; i < parts.length; i += 3) {
    const { syllable, roman } = splitHead(parts[i]);
    const id = `s-${sections.length + 1}`;
    sections.push({ id, syllable, roman });
    const note = classifyChunk(parts[i + 1] ?? "")
      .replace(/<\/?dd[^>]*>/g, " ")
      .trim();
    const body = classifyChunk(parts[i + 2] ?? "");
    out +=
      `\n<section class="syl" id="${id}">` +
      `<div class="syl-head"><h2><b class="syl-zi">${syllable}</b>` +
      (roman ? `<span class="syl-rom">${roman}</span>` : "") +
      `</h2>` +
      (note ? `<p class="syl-note">${note}</p>` : "") +
      `</div>${body}</section>`;
  }
  const entries = (out.match(/<div class="entry">/g) ?? []).length;
  return { html: out, sections, entries };
}

const volumeCache = new Map<string, VolumeData>();

const CACHE_DIR = ".cache/pug";

function cachePath(root: string, base: string): string {
  return join(root, CACHE_DIR, `${base}.json`);
}

function cacheFresh(root: string, base: string): boolean {
  try {
    const c = statSync(cachePath(root, base)).mtimeMs;
    const src = statSync(join(root, PUG_DIR, `${base}.pug`)).mtimeMs;
    const lib = statSync(join(root, "lib/compile-pug.ts")).mtimeMs;
    return c >= src && c >= lib;
  } catch {
    return false;
  }
}

export function computeVolumeData(root: string, base: string): VolumeData {
  return transformVolume(extractBodyInner(compilePugFile(root, base)));
}

export function writeVolumeCache(root: string, base: string): VolumeData {
  const data = computeVolumeData(root, base);
  mkdirSync(join(root, CACHE_DIR), { recursive: true });
  writeFileSync(cachePath(root, base), JSON.stringify(data));
  return data;
}

export function getVolumeData(root: string, base: string): VolumeData {
  const hit = volumeCache.get(base);
  if (hit) return hit;
  let data: VolumeData | undefined;
  if (cacheFresh(root, base)) {
    try {
      data = JSON.parse(readFileSync(cachePath(root, base), "utf8"));
    } catch {
      data = undefined;
    }
  }
  data ??= computeVolumeData(root, base);
  volumeCache.set(base, data);
  return data;
}

export interface VolumeSummary {
  base: string;
  first: string;
  last: string;
  sections: number;
  entries: number;
}

export function scanPugVolume(root: string, base: string): VolumeSummary {
  const src = readFileSync(join(root, PUG_DIR, `${base}.pug`), "utf8");
  const heads: string[] = [];
  for (const m of src.matchAll(/^\s*h2 (.+)$/gm)) {
    heads.push(splitHead(m[1]).syllable);
  }
  const entries = (src.match(/^\s*h3[ (.]/gm) ?? []).length;
  return {
    base,
    first: heads[0] ?? "",
    last: heads[heads.length - 1] ?? "",
    sections: heads.length,
    entries,
  };
}

const NUMS = "一二三四五六七八九";
export function chineseNumeral(n: number): string {
  if (n <= 0 || n > 99) return String(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  let s = "";
  if (tens > 1) s += NUMS[tens - 1];
  if (tens > 0) s += "十";
  if (ones > 0) s += NUMS[ones - 1];
  return s;
}

export function compileAllPug(root: string, outDir: string): { ok: number; fail: number } {
  mkdirSync(outDir, { recursive: true });
  let ok = 0;
  let fail = 0;
  for (const base of listPugPages(root)) {
    try {
      writeFileSync(join(outDir, `${base}.html`), compilePugFile(root, base), "utf8");
      ok++;
      console.log(`  ${base}.html`);
    } catch (e) {
      fail++;
      console.error(`  FAIL ${base}.pug:`, e instanceof Error ? e.message : e);
    }
  }
  return { ok, fail };
}