import { legacyPlainText, renderLegacyText } from "./legacy-text.ts";
export { legacyPlainText, renderLegacyText } from "./legacy-text.ts";
import type { LinkTarget, RenderCtx } from "./linkify.ts";
import { siteRootPrefixForPage } from "./site-url.ts";
import { entryLinkFromSection, volumeSectionPath } from "./volume-paths.ts";
import type {
  StructuredEntry,
  StructuredReading,
  StructuredReadingLine,
  StructuredSection,
  StructuredSense,
  StructuredSinogram,
  StructuredToken,
  StructuredVolume,
} from "./structured-volume.ts";

export interface SectionRailMeta {
  id: string;
  syllable: string;
  roman: string;
  note: string;
  /** Estimated block height (px) for content-visibility intrinsic size. */
  intrinsicPx?: number;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


function sameTarget(a: LinkTarget, b: RenderCtx["self"]): boolean {
  return !!b && a.v === b.v && a.l === b.l && (!b.k || a.k === b.k);
}

function legacyHtml(text: string, ctx?: RenderCtx): string {
  if (!ctx) return renderLegacyText(text);
  return renderLegacyText(
    text,
    siteRootPrefixForPage(volumeSectionPath(ctx.fromVol, ctx.fromSection)),
  );
}

function targetHref(target: LinkTarget, ctx: RenderCtx): string {
  return entryLinkFromSection(ctx.fromVol, ctx.fromSection, target, ctx.corpus);
}

function renderTargetLink(text: string, target: LinkTarget, ctx: RenderCtx): string {
  let effective = target;
  if (sameTarget(target, ctx.self)) {
    const alt = ctx.resolver.alternate(target);
    if (!alt) return legacyHtml(text, ctx);
    effective = alt;
  }
  const href = targetHref(effective, ctx);
  return `<a class="kk" href="${escapeHtml(href)}" data-kk="${effective.k}:${effective.v}:${effective.l}">${legacyHtml(text, ctx)}</a>`;
}

const LEGACY_RUBY_RE = /<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/gs;
const LEGACY_INLINE_RUBY_RE = /(\p{Script=Han})<rt>(.*?)<\/rt>|(\p{Script=Han})([\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFF}]+)/gu;
const LEGACY_K_RE = /<k>.*?<\/k>/gs;
const RENDERED_RUBY_RE = /^<ruby class="zhuyin">.*?<rt>(.*?)<\/rt><\/ruby>$/s;

function renderLinkedPlainText(text: string, ctx: RenderCtx): string {
  return ctx.resolver
    .segment(text)
    .map((seg) =>
      seg.target ? renderTargetLink(seg.text, seg.target, ctx) : legacyHtml(seg.text, ctx),
    )
    .join("");
}

function renderLinkedPlainTextOutsideK(text: string, ctx: RenderCtx): string {
  let html = "";
  let cursor = 0;
  for (const match of text.matchAll(LEGACY_K_RE)) {
    const start = match.index ?? 0;
    html += renderLinkedPlainText(text.slice(cursor, start), ctx);
    html += legacyHtml(match[0], ctx);
    cursor = start + match[0].length;
  }
  html += renderLinkedPlainText(text.slice(cursor), ctx);
  return html;
}

function renderLinkedLegacyRuby(base: string, annotation: string, ctx: RenderCtx): string {
  return `<ruby class="zhuyin">${renderLinkedPlainTextOutsideK(base, ctx)}<rt>${annotation}</rt></ruby>`;
}

function renderLinkedPuaRuby(base: string, pua: string, ctx: RenderCtx): string {
  const rendered = legacyHtml(`${base}${pua}`, ctx);
  const match = RENDERED_RUBY_RE.exec(rendered);
  if (!match) return rendered;
  return renderLinkedLegacyRuby(base, match[1]!, ctx);
}

function renderLinkedSegmentWithoutK(text: string, ctx: RenderCtx): string {
  let html = "";
  let cursor = 0;
  for (const match of text.matchAll(LEGACY_INLINE_RUBY_RE)) {
    const start = match.index ?? 0;
    const base = match[1] ?? match[3]!;
    const annotation = match[2];
    html += renderLinkedPlainText(text.slice(cursor, start), ctx);
    html += annotation === undefined
      ? renderLinkedPuaRuby(base, match[4]!, ctx)
      : renderLinkedLegacyRuby(base, annotation, ctx);
    cursor = start + match[0].length;
  }
  html += renderLinkedPlainText(text.slice(cursor), ctx);
  return html;
}

function renderLinkedSegment(text: string, ctx: RenderCtx): string {
  let html = "";
  let cursor = 0;
  for (const match of text.matchAll(LEGACY_K_RE)) {
    const start = match.index ?? 0;
    html += renderLinkedSegmentWithoutK(text.slice(cursor, start), ctx);
    html += legacyHtml(match[0], ctx);
    cursor = start + match[0].length;
  }
  html += renderLinkedSegmentWithoutK(text.slice(cursor), ctx);
  return html;
}


function renderLinkedText(text: string, ctx?: RenderCtx): string {
  if (!ctx) return renderLegacyText(text);
  let html = "";
  let cursor = 0;
  for (const match of text.matchAll(LEGACY_RUBY_RE)) {
    const start = match.index ?? 0;
    html += renderLinkedSegment(text.slice(cursor, start), ctx);
    html += renderLinkedLegacyRuby(match[1]!, match[2]!, ctx);
    cursor = start + match[0].length;
  }
  html += renderLinkedSegment(text.slice(cursor), ctx);
  return html.replaceAll("/<ruby", "/\u2060<ruby");
}

function renderCharLink(han: string, ctx?: RenderCtx): string {
  if (!ctx) return renderLegacyText(han);
  const target = ctx.resolver.char(han);
  return target ? renderTargetLink(han, target, ctx) : legacyHtml(han, ctx);
}

function renderReadingBadges(reading: StructuredReading, ctx?: RenderCtx): string {
  const badges: string[] = [];
  for (const v of reading.register) {
    badges.push(`<span class="usage-register">${legacyHtml(v, ctx)}</span>`);
  }
  for (const v of reading.geo) {
    badges.push(`<span class="usage-geo">${legacyHtml(v, ctx)}</span>`);
  }
  for (const v of reading.other) {
    badges.push(`<span class="usage-other">${legacyHtml(v, ctx)}</span>`);
  }
  return badges.join("");
}


function renderZhuyinAnnotation(raw: string): string {
  return `<span class="reading-zhuyin">${escapeHtml(legacyPlainText(raw))}</span>`;
}

function renderReadingAnnotations(readings: StructuredReading[], ctx?: RenderCtx): string {
  if (readings.length === 0) return "";
  const annotations = readings.map((reading) => renderZhuyinAnnotation(reading.zhuyin)).join("");
  const labels = readings
    .map((r) => renderReadingBadges(r, ctx))
    .filter(Boolean)
    .map((badges) => `<span class="reading-labels">${badges}</span>`)
    .join("");
  return `<rt>${annotations}</rt>${labels}`;
}

export function renderReadingChip(reading: StructuredReading, ctx?: RenderCtx): string {
  const badges = renderReadingBadges(reading, ctx);
  const labels = badges.length ? `<span class="reading-labels">${badges}</span>` : "";
  return `<span class="reading-chip"><span class="reading-zhuyin">${escapeHtml(legacyPlainText(reading.zhuyin))}</span>${labels}</span>`;
}

export function renderReadingChips(readings: StructuredReading[], ctx?: RenderCtx): string {
  if (readings.length === 0) return "";
  return readings.map((r) => renderReadingChip(r, ctx)).join("");
}

export function renderStructuredToken(token: StructuredToken, ctx?: RenderCtx): string {
  switch (token.kind) {
    case "syl": {
      const annotations = renderReadingAnnotations(token.readings, ctx);
      const han = `<span class="token-han">${renderCharLink(token.han, ctx)}</span>`;
      if (!annotations) return `<span class="token-syl">${han}</span>`;
      return `<span class="token-syl"><ruby class="token-ruby zhuyin">${han}${annotations}</ruby></span>`;
    }
    case "reading":
      return `<span class="token-reading">${renderReadingChips(token.readings, ctx)}</span>`;
    case "prose":
      return `<span class="token-prose">${renderLinkedText(token.text, ctx)}</span>`;
    case "variant": {
      const alts = token.alternatives
        .map((alt) => alt.map((t) => renderStructuredToken(t, ctx)).join(""))
        .join('<span class="variant-sep">/</span>');
      const usageBadges = [
        ...token.usages.register.map((v) => `<span class="usage-register">${legacyHtml(v, ctx)}</span>`),
        ...token.usages.geo.map((v) => `<span class="usage-geo">${legacyHtml(v, ctx)}</span>`),
        ...token.usages.other.map((v) => `<span class="usage-other">${legacyHtml(v, ctx)}</span>`),
      ].join("");
      return `<span class="variant-chip"><span class="variant-body">(/${alts})</span>${usageBadges}</span>`;
    }
  }
}

export function renderTaigiLane(tokens: StructuredToken[], ctx?: RenderCtx): string {
  return tokens.map((t) => renderStructuredToken(t, ctx)).join("");
}

export function renderStructuredSense(sense: StructuredSense, ctx?: RenderCtx): string {
  const pos =
    sense.pos && sense.pos !== "None"
      ? `<dd class="pos">${legacyHtml(sense.pos, ctx)}</dd>`
      : "";
  const mandarin = sense.mandarin
    .map(
      (line) =>
        `<dd class="lbl"><u class="lg lg-m">華語</u></dd><dd class="lane-mandarin">${renderLinkedText(line, ctx)}</dd>`,
    )
    .join("");
  const taigiBody = renderTaigiLane(sense.taigi, ctx);
  const taigi = taigiBody
    ? `<dd class="lbl"><u class="lg lg-t">台</u></dd><dd class="lane-taigi">${taigiBody}</dd>`
    : "";
  return `${pos}${mandarin}${taigi}`;
}

function renderSinogramReadingLine(line: StructuredReadingLine, ctx?: RenderCtx): string {
  const badge = `<dt><span class="src-badge">${legacyHtml(line.source, ctx)}</span></dt>`;
  if (!line.parsed) {
    const note = line.note ?? "";
    return `${badge}<dd class="reading-line-note">${legacyHtml(note, ctx)}</dd>`;
  }
  const chips = renderReadingChips(line.readings, ctx);
  const note = line.note
    ? `<span class="reading-line-note">${legacyHtml(line.note, ctx)}</span>`
    : "";
  return `${badge}<dd class="reading-line-body">${chips}${note}</dd>`;
}

export function renderSinogramEntry(s: StructuredSinogram, ctx?: RenderCtx): string {
  const head = s.han.length > 0 ? legacyHtml(s.han, ctx) : "□";
  const headChip = s.headZhuyin
    ? `<span class="reading-chip char-head-zhuyin"><span class="reading-zhuyin">${escapeHtml(legacyPlainText(s.headZhuyin))}</span></span>`
    : "";
  const fanqie = s.fanqie
    ? `<span class="char-fanqie">${legacyHtml(s.fanqie, ctx)}</span>`
    : "";
  const lines = s.readingLines.map((line) => renderSinogramReadingLine(line, ctx)).join("");
  return (
    `<div class="entry char-card" id="c-${s.line}">` +
    `<h3 class="char-head">${head}${headChip}${fanqie}</h3>` +
    `<dl class="reading-lines">${lines}</dl>` +
    `</div>`
  );
}

export function renderStructuredEntry(entry: StructuredEntry, ctx?: RenderCtx): string {
  const headHtml = entry.head.map((t) => renderStructuredToken(t, ctx)).join("");
  const title = headHtml || renderLinkedText(entry.headword, ctx);
  const senses = entry.senses.map((s) => renderStructuredSense(s, ctx)).join("");
  return `<div class="entry entry-card" id="w-${entry.line}"><h3 class="entry-spine">【${title}】</h3><dl class="sense-grid">${senses}</dl></div>`;
}

export function renderStructuredSectionBody(
  section: StructuredSection,
  ctx?: RenderCtx,
): string {
  const sinograms = section.sinograms
    .map((s) =>
      renderSinogramEntry(
        s,
        ctx ? { ...ctx, self: { k: "c", v: s.volume, l: s.line } } : undefined,
      ),
    )
    .join("");
  const entries = section.entries
    .map((e) =>
      renderStructuredEntry(
        e,
        ctx ? { ...ctx, self: { k: "w", v: e.volume, l: e.line } } : undefined,
      ),
    )
    .join("");
  return sinograms + entries;
}

export function renderStructuredSection(
  section: StructuredSection,
  meta: SectionRailMeta,
  ctx?: RenderCtx,
): string {
  const roman = meta.roman
    ? `<span class="syl-rom">${legacyHtml(meta.roman, ctx)}</span>`
    : "";
  const note = meta.note ? `<p class="syl-note">${legacyHtml(meta.note, ctx)}</p>` : "";
  const body = renderStructuredSectionBody(section, ctx);
  const cv =
    meta.intrinsicPx && meta.intrinsicPx > 0
      ? ` style="contain-intrinsic-size: auto ${meta.intrinsicPx}px"`
      : "";
  return (
    `<section class="syl" id="${escapeHtml(meta.id)}"${cv}>` +
    `<div class="syl-head"><h2><b class="syl-zi">${legacyHtml(meta.syllable, ctx)}</b>${roman}</h2>${note}</div>` +
    body +
    `</section>`
  );
}

export function renderStructuredVolumeBody(
  volume: StructuredVolume,
  sectionMeta: SectionRailMeta[],
  ctx?: RenderCtx,
): string {
  const sections = volume.sections
    .map((section, i) => renderStructuredSection(section, sectionMeta[i]!, ctx))
    .join("");
  return `<div class="structured-doc">${sections}</div>`;
}
