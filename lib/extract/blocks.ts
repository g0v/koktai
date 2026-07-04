export interface RawSinogramBlock {
  line: number;
  charLine: string;
  readingLines: { line: number; text: string }[];
}

export interface RawWordLine {
  line: number;
  text: string;
}

export interface VolumeBlocks {
  chapters: { line: number; zhuyin: string }[];
  sinograms: RawSinogramBlock[];
  words: RawWordLine[];
  chapterOf(line: number): string;
}

const CHAPTER_HEAD = ".章首";
const ENTRY = ".本文";
const CHAR_LINE = /^~(?:fm7|fk|fm3)t168/;

function isWordContinuation(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith(CHAPTER_HEAD)) return false;
  if (t.startsWith(ENTRY)) return false;
  if (t.startsWith("~t96;")) return false;
  if (t.startsWith("~fm7;")) return false;
  return true;
}

function parseChapterZhuyin(line: string): string {
  const m = line.match(/^(.*?)(?:\s|~)/);
  return (m?.[1] ?? line).trim();
}

function chapterOfLine(chapters: { line: number; zhuyin: string }[], line: number): string {
  let zhuyin = "";
  for (const ch of chapters) {
    if (ch.line <= line) zhuyin = ch.zhuyin;
    else break;
  }
  return zhuyin;
}

export function splitVolume(recoded: string): VolumeBlocks {
  const chapters: { line: number; zhuyin: string }[] = [];
  const sinograms: RawSinogramBlock[] = [];
  const words: RawWordLine[] = [];

  let pendingChapter = false;
  let sinogram: RawSinogramBlock | null = null;
  let wordBuf: string[] = [];
  let wordStartLine = 0;
  let pendingReadingLines: { line: number; text: string }[] = [];

  const flushWord = () => {
    if (wordBuf.length === 0) return;
    words.push({ line: wordStartLine, text: wordBuf.join("") });
    wordBuf = [];
  };

  const flushSinogram = () => {
    if (sinogram) {
      sinograms.push(sinogram);
      sinogram = null;
    }
  };

  const lines = recoded.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i]!;
    const trimmed = raw.trim();

    if (trimmed.startsWith(CHAPTER_HEAD)) {
      flushWord();
      flushSinogram();
      pendingChapter = true;
      continue;
    }

    if (pendingChapter) {
      if (trimmed) {
        chapters.push({ line: lineNo, zhuyin: parseChapterZhuyin(trimmed) });
        pendingChapter = false;
      }
      continue;
    }

    if (trimmed.startsWith(ENTRY)) {
      flushWord();
      if (!sinogram || sinogram.readingLines.length > 0) flushSinogram();
      continue;
    }

    if (CHAR_LINE.test(trimmed)) {
      flushWord();
      flushSinogram();
      sinogram = { line: lineNo, charLine: raw, readingLines: pendingReadingLines };
      pendingReadingLines = [];
      continue;
    }

    if (trimmed.startsWith("~fm7;")) {
      if (sinogram) {
        sinogram.readingLines.push({ line: lineNo, text: raw });
      } else {
        pendingReadingLines.push({ line: lineNo, text: raw });
      }
      continue;
    }

    if (trimmed.startsWith("~t96;")) {
      flushWord();
      flushSinogram();
      wordBuf = [raw.trim()];
      wordStartLine = lineNo;
      continue;
    }

    if (wordBuf.length > 0 && isWordContinuation(raw)) {
      wordBuf.push(raw.trim());
      continue;
    }

    if (wordBuf.length > 0) {
      flushWord();
    }
  }

  flushWord();
  flushSinogram();

  return {
    chapters,
    sinograms,
    words,
    chapterOf: (line: number) => chapterOfLine(chapters, line),
  };
}