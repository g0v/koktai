import { parseWordLine } from "../dic/analyse/word.ts";
import { recodeDicFile } from "../dic/cp950.ts";
import { resolveVolumeDic, VOLUME_IDS } from "../dic/pipeline.ts";
import { splitVolume } from "./blocks.ts";
import { normalizeTaigi } from "./normalize.ts";
import { parseSinogram } from "./sinogram.ts";
import { loadSyllables } from "./syllables.ts";
import { serializeTokens, tokenizeTaigi } from "./tokenize.ts";
import type {
  Anomaly,
  Reading,
  SinogramEntry,
  Token,
  Usage,
  WordRecord,
} from "./types.ts";
import { parseWord } from "./word-readings.ts";

export interface ExtractStats {
  volumes: number;
  sinograms: number;
  readingLines: number;
  readingLinesParsed: number;
  readingLineBySource: Record<string, { total: number; parsed: number }>;
  words: number;
  senses: number;
  syllableTokens: number;
  readings: number;
  labeledReadings: number;
  variantGroups: number;
  bareReadings: number;
  proseTokens: number;
  structuredTokenCoverage: number;
  usageByDim: Record<string, number>;
  roundtripFailures: number;
  anomalies: number;
}

export interface ExtractResult {
  sinograms: SinogramEntry[];
  words: WordRecord[];
  anomalies: Anomaly[];
  stats: ExtractStats;
}

function emptyStats(): ExtractStats {
  return {
    volumes: 0,
    sinograms: 0,
    readingLines: 0,
    readingLinesParsed: 0,
    readingLineBySource: {},
    words: 0,
    senses: 0,
    syllableTokens: 0,
    readings: 0,
    labeledReadings: 0,
    variantGroups: 0,
    bareReadings: 0,
    proseTokens: 0,
    structuredTokenCoverage: 0,
    usageByDim: {},
    roundtripFailures: 0,
    anomalies: 0,
  };
}

function bumpUsage(usages: Usage[], usageByDim: Record<string, number>): void {
  for (const u of usages) {
    usageByDim[u.dim] = (usageByDim[u.dim] ?? 0) + 1;
  }
}

function countReading(r: Reading, stats: ExtractStats): void {
  stats.readings += 1;
  if (r.usages.length > 0) stats.labeledReadings += 1;
  bumpUsage(r.usages, stats.usageByDim);
}

function accumulateTokens(tokens: Token[], stats: ExtractStats): void {
  for (const t of tokens) {
    if (t.kind === "syl") {
      stats.syllableTokens += 1;
      for (const r of t.readings) countReading(r, stats);
    } else if (t.kind === "variant") {
      stats.variantGroups += 1;
      bumpUsage(t.usages, stats.usageByDim);
      for (const alt of t.alternatives) accumulateTokens(alt, stats);
    } else if (t.kind === "reading") {
      stats.bareReadings += 1;
      for (const r of t.readings) countReading(r, stats);
    } else {
      stats.proseTokens += 1;
    }
  }
}

function tokenCoverage(tokens: Token[]): { structured: number; total: number } {
  let structured = 0;
  let total = 0;
  for (const t of tokens) {
    total += 1;
    if (t.kind === "syl") {
      if (t.readings.length > 0) structured += 1;
    } else if (t.kind === "variant" || t.kind === "reading") {
      structured += 1;
      if (t.kind === "variant") {
        for (const alt of t.alternatives) {
          const sub = tokenCoverage(alt);
          structured += sub.structured;
          total += sub.total;
        }
      }
    }
  }
  return { structured, total };
}

function inlineTaigiFromMandarin(sentence: string): string | null {
  const m = sentence.match(/\(台\)(.+)$/u);
  return m ? m[1]! : null;
}

function taigiRunsFromWordLine(text: string, root: string): string[] {
  const entry = parseWordLine(text, root);
  if (!entry) return [];
  const out: string[] = [];
  for (const sent of entry.sentences) {
    if (sent.lang === "台") out.push(sent.sentence);
    else if (sent.lang === "國語") {
      const tail = inlineTaigiFromMandarin(sent.sentence);
      if (tail) out.push(tail);
    }
  }
  return out;
}

function checkRoundtrip(
  volume: string,
  line: number,
  norm: string,
  tokens: Token[],
  anomalies: Anomaly[],
  stats: ExtractStats,
): void {
  try {
    const got = serializeTokens(norm, tokens);
    if (got !== norm) {
      stats.roundtripFailures += 1;
      anomalies.push({
        volume,
        line,
        stage: "roundtrip",
        message: `diff len ${norm.length} vs ${got.length}`,
        raw: norm.slice(0, 200),
      });
    }
  } catch (e) {
    stats.roundtripFailures += 1;
    anomalies.push({
      volume,
      line,
      stage: "roundtrip",
      message: e instanceof Error ? e.message : String(e),
      raw: norm.slice(0, 200),
    });
  }
}

/** Consecutive same headword → one record; senses appended; first record metadata kept. */
function mergeWordRecords(words: WordRecord[]): WordRecord[] {
  const out: WordRecord[] = [];
  for (const rec of words) {
    const last = out.at(-1);
    if (last && last.headword === rec.headword && last.volume === rec.volume) {
      last.senses.push(...rec.senses);
    } else {
      out.push(rec);
    }
  }
  return out;
}

function accumulateSinogramStats(entry: SinogramEntry, stats: ExtractStats): void {
  for (const l of entry.readingLines) {
    stats.readingLines += 1;
    const bucket = (stats.readingLineBySource[l.source] ??= { total: 0, parsed: 0 });
    bucket.total += 1;
    if (l.parsed) {
      stats.readingLinesParsed += 1;
      bucket.parsed += 1;
    }
    for (const r of l.readings) countReading(r, stats);
  }
}

const extractVolumeCache = new Map<string, ExtractResult>();

export function extractVolume(root: string, volume: string): ExtractResult {
  const key = `${root}\0${volume}`;
  const hit = extractVolumeCache.get(key);
  if (hit) return hit;
  const result = extractVolumeUncached(root, volume);
  extractVolumeCache.set(key, result);
  return result;
}

function extractVolumeUncached(root: string, volume: string): ExtractResult {
  const s = loadSyllables(root);
  const dicPath = resolveVolumeDic(root, volume);
  const blocks = splitVolume(recodeDicFile(dicPath));
  const anomalies: Anomaly[] = [];
  const stats = emptyStats();
  stats.volumes = 1;

  const sinograms = blocks.sinograms.map((b) => {
    const ch = blocks.chapterOf(b.line);
    const entry = parseSinogram(b, volume, ch, s);
    accumulateSinogramStats(entry, stats);
    return entry;
  });
  stats.sinograms = sinograms.length;

  const rawWords: WordRecord[] = [];
  let covStructured = 0;
  let covTotal = 0;

  for (const w of blocks.words) {
    let rec: WordRecord | null = null;
    try {
      rec = parseWord(w, volume, blocks.chapterOf(w.line), s, root);
    } catch (e) {
      anomalies.push({
        volume,
        line: w.line,
        stage: "tokenize",
        message: e instanceof Error ? e.message : String(e),
        raw: w.text.slice(0, 200),
      });
      continue;
    }
    if (!rec) {
      anomalies.push({
        volume,
        line: w.line,
        stage: "word",
        message: "parseWordLine returned null",
        raw: w.text.slice(0, 200),
      });
      continue;
    }
    rawWords.push(rec);
    for (const sense of rec.senses) {
      stats.senses += 1;
      accumulateTokens(sense.taigi, stats);
      const cov = tokenCoverage(sense.taigi);
      covStructured += cov.structured;
      covTotal += cov.total;
    }
    for (const run of taigiRunsFromWordLine(w.text, root)) {
      try {
        const norm = normalizeTaigi(run, s);
        const tokens = tokenizeTaigi(norm, s);
        checkRoundtrip(volume, w.line, norm, tokens, anomalies, stats);
      } catch (e) {
        anomalies.push({
          volume,
          line: w.line,
          stage: "tokenize",
          message: e instanceof Error ? e.message : String(e),
          raw: run.slice(0, 200),
        });
      }
    }
  }

  const words = mergeWordRecords(rawWords);
  stats.words = words.length;
  stats.structuredTokenCoverage = covTotal > 0 ? covStructured / covTotal : 0;
  stats.anomalies = anomalies.length;

  return { sinograms, words, anomalies, stats };
}

function mergeStats(into: ExtractStats, from: ExtractStats): void {
  into.sinograms += from.sinograms;
  into.readingLines += from.readingLines;
  into.readingLinesParsed += from.readingLinesParsed;
  into.words += from.words;
  into.senses += from.senses;
  into.syllableTokens += from.syllableTokens;
  into.readings += from.readings;
  into.labeledReadings += from.labeledReadings;
  into.variantGroups += from.variantGroups;
  into.bareReadings += from.bareReadings;
  into.proseTokens += from.proseTokens;
  into.roundtripFailures += from.roundtripFailures;
  for (const [src, v] of Object.entries(from.readingLineBySource)) {
    const bucket = (into.readingLineBySource[src] ??= { total: 0, parsed: 0 });
    bucket.total += v.total;
    bucket.parsed += v.parsed;
  }
  for (const [dim, n] of Object.entries(from.usageByDim)) {
    into.usageByDim[dim] = (into.usageByDim[dim] ?? 0) + n;
  }
}

export function extractAll(root: string): ExtractResult {
  const sinograms: SinogramEntry[] = [];
  const words: WordRecord[] = [];
  const anomalies: Anomaly[] = [];
  const stats = emptyStats();
  stats.volumes = VOLUME_IDS.length;

  let covStructured = 0;
  let covTotal = 0;

  for (const vol of VOLUME_IDS) {
    const r = extractVolume(root, vol);
    sinograms.push(...r.sinograms);
    words.push(...r.words);
    anomalies.push(...r.anomalies);
    mergeStats(stats, r.stats);
    if (r.stats.structuredTokenCoverage > 0 || r.stats.senses > 0) {
      const volCov = tokenCoverage(
        r.words.flatMap((w) => w.senses.flatMap((sense) => sense.taigi)),
      );
      covStructured += volCov.structured;
      covTotal += volCov.total;
    }
  }

  stats.anomalies = anomalies.length;
  stats.structuredTokenCoverage = covTotal > 0 ? covStructured / covTotal : 0;

  return { sinograms, words, anomalies, stats };
}