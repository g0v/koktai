import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { LinkTarget } from "./linkify.ts";
import type { Corpus } from "./corpus.ts";
import { VOLUME_IDS } from "../dic/pipeline.ts";
import {
  buildSectionEntryIndex,
  entryAnchor,
  sectionForTarget,
  entryLinkFromSection,
  volumeSectionPath,
} from "./volume-paths.ts";

/** Paths under `dist/` (site root, not repo root). */
export interface BuiltPageRef {
  rel: string;
  vol: string;
  /** 1-based syllable section; null = hub or monolith. */
  section: number | null;
}

const VOL_RE = /^(0[1-9]|1[0-9]|2[0-6])$/;

export function extractElementIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]!);
  return ids;
}

const VOL_PAGE_RE =
  /^(?:\.\.\/)*(0[1-9]|1[0-9]|2[0-6])\/(\d+)\/index\.html$/;
const VOL_HUB_RE = /^(?:\.\.\/)*(0[1-9]|1[0-9]|2[0-6])\/index\.html$/;

/** Parse page-relative or same-page dictionary entry href. */
export function parseDictionaryHref(
  href: string,
  _siteBase?: string,
): { page: string; vol: string; section: number | null; anchor: string | null } | null {
  let path = href.trim();
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname.replace(/^\//, "");
    } catch {
      return null;
    }
  }
  if (path.startsWith("#")) {
    const anchor = path.slice(1);
    if (!/^(w|c)-\d+$/.test(anchor)) return null;
    return { page: "", vol: "", section: null, anchor };
  }
  const hashIdx = path.indexOf("#");
  const anchor = hashIdx >= 0 ? path.slice(hashIdx + 1) : null;
  path = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  let m = path.match(VOL_PAGE_RE);
  if (m) {
    const vol = m[1]!;
    const section = Number.parseInt(m[2]!, 10);
    if (anchor && !/^(w|c)-\d+$/.test(anchor)) return null;
    return {
      page: `${vol}/${section}/index.html`,
      vol,
      section,
      anchor,
    };
  }
  m = path.match(VOL_HUB_RE);
  if (m) {
    const vol = m[1]!;
    if (anchor && !/^(w|c)-\d+$/.test(anchor)) return null;
    return { page: `${vol}/index.html`, vol, section: null, anchor };
  }
  return null;
}

export function listBuiltDictionaryPages(distRoot: string): BuiltPageRef[] {
  const out: BuiltPageRef[] = [];
  for (const vol of VOLUME_IDS) {
    const volDir = join(distRoot, vol);
    if (!existsSync(volDir)) continue;
    const hubIndex = join(volDir, "index.html");
    if (existsSync(hubIndex)) {
      out.push({ rel: `${vol}/index.html`, vol, section: null });
    }
    for (const name of readdirSync(volDir)) {
      if (!/^\d+$/.test(name)) continue;
      const secPath = join(volDir, name, "index.html");
      if (existsSync(secPath)) {
        out.push({ rel: `${vol}/${name}/index.html`, vol, section: Number(name) });
      }
    }
  }
  return out;
}

/** Every word/sinogram must map to a section; anchors must match line numbers. */
export function verifyCorpusSectionRouting(corpus: Corpus): string[] {
  const errors: string[] = [];
  for (const vol of VOLUME_IDS) {
    const data = corpus.volumes.get(vol);
    if (!data) continue;
    for (const w of data.words) {
      const sec = corpus.sectionOf(vol, w.chapterZhuyin);
      if (sec <= 0) {
        errors.push(`${vol} word line ${w.line}: no section for chapter ${w.chapterZhuyin}`);
      }
    }
    for (const s of data.sinograms) {
      const sec = corpus.sectionOf(vol, s.chapterZhuyin);
      if (sec <= 0) {
        errors.push(`${vol} sinogram line ${s.line}: no section for chapter ${s.chapterZhuyin}`);
      }
    }
  }
  return errors;
}

/** Hrefs from `entryLinkFromSection` must land on the section that owns the anchor. */
export function verifyTargetHrefRouting(corpus: Corpus): string[] {
  const index = buildSectionEntryIndex(corpus);
  const errors: string[] = [];
  const check = (fromVol: string, fromSection: number, target: LinkTarget) => {
    const href = entryLinkFromSection(fromVol, fromSection, target, corpus);
    const parsed = parseDictionaryHref(href);
    if (!parsed?.anchor) {
      errors.push(`target ${target.k}:${target.v}:${target.l} → href missing anchor: ${href}`);
      return;
    }
    const expectedSec = index.volumes[target.v]?.[parsed.anchor];
    if (expectedSec === undefined) {
      errors.push(`target ${target.k}:${target.v}:${target.l} → anchor ${parsed.anchor} not in entry index`);
      return;
    }
    if (parsed.section !== expectedSec) {
      errors.push(
        `target ${target.k}:${target.v}:${target.l} → section ${parsed.section} !== expected ${expectedSec} (${href})`,
      );
    }
    const viaFn = sectionForTarget(corpus, target);
    if (viaFn !== expectedSec) {
      errors.push(
        `sectionForTarget ${target.k}:${target.v}:${target.l} → ${viaFn} !== index ${expectedSec}`,
      );
    }
  };
  for (const vol of VOLUME_IDS) {
    const data = corpus.volumes.get(vol);
    if (!data) continue;
    for (const w of data.words) {
      const fromSec = corpus.sectionOf(vol, w.chapterZhuyin);
      if (fromSec > 0) check(vol, fromSec, { k: "w", v: vol, l: w.line });
    }
    for (const s of data.sinograms) {
      const fromSec = corpus.sectionOf(vol, s.chapterZhuyin);
      if (fromSec > 0) check(vol, fromSec, { k: "c", v: vol, l: s.line });
    }
  }
  return errors;
}

export function collectHrefTargetsFromHtml(html: string): { href: string; fromKk: boolean }[] {
  const out: { href: string; fromKk: boolean }[] = [];
  for (const m of html.matchAll(/<a\s[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
    const tag = m[0]!;
    out.push({ href: m[1]!, fromKk: /\bclass="[^"]*kk/.test(tag) });
  }
  return out;
}

/** Scan built HTML: entry anchors must exist on the resolved target page. */
export function verifyBuiltHtmlAnchors(distRoot: string): string[] {
  const pages = listBuiltDictionaryPages(distRoot);
  if (pages.length === 0) return ["no dictionary pages under dist/ (run astro build)"];

  const idsByPage = new Map<string, Set<string>>();
  for (const p of pages) {
    const full = join(distRoot, p.rel);
    const html = readFileSync(full, "utf8");
    idsByPage.set(p.rel, extractElementIds(html));
  }

  const errors: string[] = [];
  const resolveTargetIds = (vol: string, section: number | null): Set<string> | undefined => {
    if (section !== null) {
      return idsByPage.get(volumeSectionPath(vol, section));
    }
    return idsByPage.get(`${vol}/index.html`);
  };

  for (const p of pages) {
    const html = readFileSync(join(distRoot, p.rel), "utf8");
    for (const { href, fromKk } of collectHrefTargetsFromHtml(html)) {
      const parsed = parseDictionaryHref(href);
      if (!parsed) continue;
      if (!fromKk) continue;
      if (!parsed.anchor) continue;

      let targetVol: string;
      let targetSection: number | null;
      if (href.trim().startsWith("#")) {
        targetVol = p.vol;
        targetSection = p.section;
      } else {
        if (!VOL_RE.test(parsed.vol)) continue;
        targetVol = parsed.vol;
        targetSection = parsed.section;
      }

      const targetIds = resolveTargetIds(targetVol, targetSection);
      if (!targetIds) {
        errors.push(`${p.rel}: link ${href} → missing target page`);
        continue;
      }
      if (!targetIds.has(parsed.anchor)) {
        errors.push(`${p.rel}: link ${href} → id ${parsed.anchor} not on target`);
      }
    }
  }
  return errors;
}

export function expectedSectionHtmlPath(vol: string, section: number): string {
  return volumeSectionPath(vol, section);
}