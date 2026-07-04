/** One language-tagged sentence in a dictionary gloss. */
export interface LanguageSentence {
  lang: "國語" | "台";
  sentence: string;
}

/** Parsed heteronym / sense row from a ~t96; line group. */
export interface WordEntry {
  entry: string;
  nh: string;
  POS: string;
  body: string;
  sentences: LanguageSentence[];
}

/** Chapter header block (.章首 / ~t112). */
export interface ChapterEntry {
  entry: string;
  zhuyin2: string;
  body: string;
  notes: string[];
}

export type DicBlock =
  | { kind: "chapter"; chapter: ChapterEntry }
  | { kind: "word"; entry: string; heteronyms: WordEntry[] };