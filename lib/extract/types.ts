/** One classified usage label. */
export interface Usage {
  dim:
    | "register" | "geo" | "source" | "phenomenon" | "frequency"
    | "attitude" | "translation" | "certainty" | "other";
  value: string;
}

/** One pronunciation. `zhuyin` uses the exact strings from font/m3.json. */
export interface Reading {
  zhuyin: string;
  usages: Usage[];
}

/**
 * Every token records its source span `[start, end)` into the NORMALIZED
 * sentence string. `serializeTokens` concatenates `input.slice(...span)`, so
 * the round-trip invariant reduces to: spans partition the input (start 0,
 * contiguous, end input.length). Tokenization can then never lose text —
 * labels consumed into `usages` still live inside their token's span.
 */
export interface HanSyllable {
  kind: "syl";
  /** One display unit: a han char, `～`, a `<k>…</k>` run, or a bare PUA glyph char. */
  han: string;
  readings: Reading[];
  span: [number, number];
}
/** `(/a/b)` variant-spelling group; each alternative is itself token text. */
export interface VariantGroup {
  kind: "variant";
  alternatives: Token[][];
  /** trailing `：label` inside the group, e.g. (/濟/多：訓讀) */
  usages: Usage[];
  span: [number, number];
}
/** Readings with no base (quoted alternates already consumed elsewhere end up attached; leftovers stay bare). */
export interface BareReading {
  kind: "reading";
  readings: Reading[];
  span: [number, number];
}
export interface ProseRun {
  kind: "prose";
  text: string;
  span: [number, number];
}

export type Token = HanSyllable | VariantGroup | BareReading | ProseRun;

/** One `~fm7;` line of a sinogram block. */
export interface ReadingLine {
  line: number;              // 1-based in recoded text
  source: string;            // "國音" | "台甘" | "普閩" | rare others — keep open
  readings: Reading[];
  note: string | null;       // interleaved / trailing prose, PE2 tags stripped
  raw: string;               // original line, verbatim
  parsed: boolean;           // false → readings=[] and note=raw-without-tags
}

export interface SinogramEntry {
  kind: "sinogram";
  volume: string;            // "01"…"26"
  line: number;              // 1-based in recoded text
  chapterZhuyin: string;     // e.g. "ㄅㄚ"
  han: string;
  headZhuyin: string | null;
  fanqie: string | null;
  readingLines: ReadingLine[];
}

export interface WordSense {
  nh: string;                // heteronym number from ~fd6;N~fd0;, "1" default
  pos: string;               // "[名]" | "None"
  taigi: Token[];            // parsed 台-language text
  mandarin: string[];        // 國語 sentences, verbatim
}

export interface WordRecord {
  kind: "word";
  volume: string;
  line: number;
  chapterZhuyin: string;
  headword: string;          // han only, e.g. "八卦"
  head: HanSyllable[];       // headword syllables with readings
  senses: WordSense[];
}

export interface Anomaly {
  volume: string;
  line: number;
  stage: "blocks" | "sinogram" | "normalize" | "tokenize" | "word" | "roundtrip";
  message: string;
  raw: string;
}

export interface Syllables {
  m3: Record<string, string>;        // hex → zhuyin
  k: Record<string, string>;         // hex → zhuyin or rare-char text
  m3Noruby: Record<string, string>;  // hex → plain text (〾-prefixed = image-only)
  mapping: Record<string, string>;   // PUA char → standard char
  /** zhuyin string → m3 hex (first wins), for the k→m3 swap. */
  m3Reverse: Record<string, string>;
}

export type PuaClass =
  | { type: "reading"; zhuyin: string }                  // in m3
  | { type: "kReading"; zhuyin: string; m3Hex?: string } // k value is bopomofo; m3Hex present iff an m3 entry has the identical string (exactly 1 code today: k "8dd6" ㄤˇ)
  | { type: "kGlyph"; text: string }                     // k value is a rare sinogram
  | { type: "symbol"; text: string }                     // m3_noruby (non-〾) / mapping.json / circled digit
  | { type: "glyph" };                                   // bitmap-only