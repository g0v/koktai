import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractAll } from "../lib/extract/extract.ts";
import type {
  BareReading,
  HanSyllable,
  ReadingLine,
  SinogramEntry,
  Token,
  VariantGroup,
  WordRecord,
  WordSense,
} from "../lib/extract/types.ts";

const root = process.cwd();
const full = process.argv.includes("--full");
const outDir = join(root, "data");

function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, replacer, 0);
}

function replacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    const sorted: Record<string, unknown> = {};
    for (const k of keys) sorted[k] = o[k];
    return sorted;
  }
  return value;
}

function sinogramForJsonl(e: SinogramEntry): Record<string, unknown> {
  const readingLines = e.readingLines.map((l: ReadingLine) => {
    const base: Record<string, unknown> = {
      line: l.line,
      source: l.source,
      readings: l.readings,
      note: l.note,
      parsed: l.parsed,
    };
    if (!l.parsed) base.raw = l.raw;
    return base;
  });
  return {
    v: 1,
    kind: e.kind,
    volume: e.volume,
    line: e.line,
    chapterZhuyin: e.chapterZhuyin,
    han: e.han,
    headZhuyin: e.headZhuyin,
    fanqie: e.fanqie,
    readingLines,
  };
}

function reduceTaigi(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    if (t.kind === "syl") {
      if (t.readings.length > 0) out.push(t);
    } else if (t.kind === "variant") {
      const v = t as VariantGroup;
      out.push({
        ...v,
        alternatives: v.alternatives.map((alt) => reduceTaigi(alt)),
      });
    } else if (t.kind === "reading") {
      out.push(t as BareReading);
    }
  }
  return out;
}

function wordForJsonl(w: WordRecord): Record<string, unknown> {
  const senses = w.senses.map((sense: WordSense) => ({
    nh: sense.nh,
    pos: sense.pos,
    mandarin: sense.mandarin,
    taigi: reduceTaigi(sense.taigi),
  }));
  return {
    v: 1,
    kind: w.kind,
    volume: w.volume,
    line: w.line,
    chapterZhuyin: w.chapterZhuyin,
    headword: w.headword,
    head: w.head,
    senses,
  };
}

function wordForFull(w: WordRecord): Record<string, unknown> {
  return {
    v: 1,
    kind: w.kind,
    volume: w.volume,
    line: w.line,
    chapterZhuyin: w.chapterZhuyin,
    headword: w.headword,
    head: w.head,
    senses: w.senses,
  };
}

mkdirSync(outDir, { recursive: true });

const result = extractAll(root);

const sinoLines = result.sinograms.map((e) => stableStringify(sinogramForJsonl(e))).join("\n") + "\n";
const wordLines = result.words.map((w) => stableStringify(wordForJsonl(w))).join("\n") + "\n";

writeFileSync(join(outDir, "koktai-sinogram-readings.jsonl"), sinoLines, "utf8");
writeFileSync(join(outDir, "koktai-word-readings.jsonl"), wordLines, "utf8");
writeFileSync(join(outDir, "extract-stats.json"), stableStringify(result.stats) + "\n", "utf8");
writeFileSync(
  join(outDir, "extract-anomalies.jsonl"),
  result.anomalies.map((a) => stableStringify(a)).join("\n") + (result.anomalies.length ? "\n" : ""),
  "utf8",
);

if (full) {
  const fullLines = [
    ...result.sinograms.map((e) => stableStringify({ v: 1, ...e })),
    ...result.words.map((w) => stableStringify(wordForFull(w))),
  ].join("\n") + "\n";
  writeFileSync(join(outDir, "koktai-full.jsonl"), fullLines, "utf8");
}

const readme = `# Koktai structured readings

Provenance: 吳守禮《國臺對照活用辭典》 (26 \`.dic\` volumes, CP950 recoded).

License: CC-BY-SA 3.0 TW (inherited from source; see repo README).

Schema: \`lib/extract/types.ts\`

Regenerate:

\`\`\`bash
bun run extract:readings
bun run export:tei
\`\`\`

Optional full token streams (gitignored):

\`\`\`bash
bun run extract:readings -- --full
\`\`\`

Files:
- koktai-sinogram-readings.jsonl — per-sinogram blocks.
- koktai-word-readings.jsonl — word entries with reduced 台語 tokens.
- extract-stats.json — corpus counters and coverage.
- extract-anomalies.jsonl — preserved parse/round-trip anomaly records.
- koktai-pron.tei.xml — TEI pronunciation/usg layer for sinogram blocks.

Current extraction stats: ${result.stats.volumes} volumes, ${result.stats.sinograms.toLocaleString("en-US")} sinogram blocks, ${result.stats.words.toLocaleString("en-US")} word records, ${result.stats.senses.toLocaleString("en-US")} senses, ${result.stats.readingLines.toLocaleString("en-US")} reading lines, ${result.stats.readingLinesParsed.toLocaleString("en-US")} parsed reading lines, ${result.stats.readings.toLocaleString("en-US")} reading values, ${result.stats.roundtripFailures} round-trip failures, ${result.stats.anomalies} anomalies.
`;

writeFileSync(join(outDir, "README.md"), readme, "utf8");

console.log(JSON.stringify(result.stats, null, 2));