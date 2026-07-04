import type { RenderCtx } from "./linkify.ts";
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
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderReadingChip(reading: StructuredReading): string {
  const badges: string[] = [];
  for (const v of reading.register) {
    badges.push(`<span class="usage-register">${escapeHtml(v)}</span>`);
  }
  for (const v of reading.geo) {
    badges.push(`<span class="usage-geo">${escapeHtml(v)}</span>`);
  }
  for (const v of reading.other) {
    badges.push(`<span class="usage-other">${escapeHtml(v)}</span>`);
  }
  const labels = badges.length ? `<span class="reading-labels">${badges.join("")}</span>` : "";
  return `<span class="reading-chip"><span class="reading-zhuyin">${escapeHtml(reading.zhuyin)}</span>${labels}</span>`;
}

export function renderReadingChips(readings: StructuredReading[]): string {
  if (readings.length === 0) return "";
  return readings.map(renderReadingChip).join("");
}

export function renderStructuredToken(token: StructuredToken): string {
  switch (token.kind) {
    case "syl": {
      const chips = renderReadingChips(token.readings);
      return `<span class="token-syl"><span class="token-han">${escapeHtml(token.han)}</span>${chips}</span>`;
    }
    case "reading":
      return `<span class="token-reading">${renderReadingChips(token.readings)}</span>`;
    case "prose":
      return `<span class="token-prose">${escapeHtml(token.text)}</span>`;
    case "variant": {
      const alts = token.alternatives
        .map((alt) => alt.map(renderStructuredToken).join(""))
        .join('<span class="variant-sep">/</span>');
      const usageBadges = [
        ...token.usages.register.map(
          (v) => `<span class="usage-register">${escapeHtml(v)}</span>`,
        ),
        ...token.usages.geo.map((v) => `<span class="usage-geo">${escapeHtml(v)}</span>`),
        ...token.usages.other.map((v) => `<span class="usage-other">${escapeHtml(v)}</span>`),
      ].join("");
      return `<span class="variant-chip"><span class="variant-body">(/${alts})</span>${usageBadges}</span>`;
    }
  }
}

export function renderTaigiLane(tokens: StructuredToken[]): string {
  return tokens.map(renderStructuredToken).join("");
}

export function renderStructuredSense(sense: StructuredSense): string {
  const pos =
    sense.pos && sense.pos !== "None"
      ? `<dd class="pos">${escapeHtml(sense.pos)}</dd>`
      : "";
  const mandarin = sense.mandarin
    .map(
      (line) =>
        `<dd class="lbl"><u class="lg lg-m">華語</u></dd><dd class="lane-mandarin">${escapeHtml(line)}</dd>`,
    )
    .join("");
  const taigiBody = renderTaigiLane(sense.taigi);
  const taigi = taigiBody
    ? `<dd class="lbl"><u class="lg lg-t">台</u></dd><dd class="lane-taigi">${taigiBody}</dd>`
    : "";
  return `${pos}${mandarin}${taigi}`;
}


function renderSinogramReadingLine(line: StructuredReadingLine): string {
  const badge = `<dt><span class="src-badge">${escapeHtml(line.source)}</span></dt>`;
  if (!line.parsed) {
    const note = line.note ?? "";
    return `${badge}<dd class="reading-line-note">${escapeHtml(note)}</dd>`;
  }
  const chips = renderReadingChips(line.readings);
  const note = line.note
    ? `<span class="reading-line-note">${escapeHtml(line.note)}</span>`
    : "";
  return `${badge}<dd class="reading-line-body">${chips}${note}</dd>`;
}

export function renderSinogramEntry(s: StructuredSinogram, _ctx?: RenderCtx): string {
  const head = s.han.length > 0 ? escapeHtml(s.han) : "□";
  const headChip = s.headZhuyin
    ? `<span class="reading-chip char-head-zhuyin"><span class="reading-zhuyin">${escapeHtml(s.headZhuyin)}</span></span>`
    : "";
  const fanqie = s.fanqie
    ? `<span class="char-fanqie">${escapeHtml(s.fanqie)}</span>`
    : "";
  const lines = s.readingLines.map(renderSinogramReadingLine).join("");
  return (
    `<div class="entry char-card" id="c-${s.line}">` +
    `<h3 class="char-head">${head}${headChip}${fanqie}</h3>` +
    `<dl class="reading-lines">${lines}</dl>` +
    `</div>`
  );
}

export function renderStructuredEntry(entry: StructuredEntry, _ctx?: RenderCtx): string {
  const headHtml = entry.head.map(renderStructuredToken).join("");
  const title = headHtml || escapeHtml(entry.headword);
  const senses = entry.senses.map(renderStructuredSense).join("");
  return `<div class="entry entry-card" id="w-${entry.line}"><h3 class="entry-spine">【${title}】</h3><dl class="sense-grid">${senses}</dl></div>`;
}

export function renderStructuredSection(
  section: StructuredSection,
  meta: SectionRailMeta,
  ctx?: RenderCtx,
): string {
  const roman = meta.roman
    ? `<span class="syl-rom">${escapeHtml(meta.roman)}</span>`
    : "";
  const note = meta.note ? `<p class="syl-note">${escapeHtml(meta.note)}</p>` : "";
  const sinograms = section.sinograms.map((s) => renderSinogramEntry(s, ctx)).join("");
  const entries = section.entries.map((e) => renderStructuredEntry(e, ctx)).join("");
  return (
    `<section class="syl" id="${escapeHtml(meta.id)}">` +
    `<div class="syl-head"><h2><b class="syl-zi">${escapeHtml(meta.syllable)}</b>${roman}</h2>${note}</div>` +
    sinograms +
    entries +
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