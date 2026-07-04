import type { DicBlock } from "./types.ts";
import { parseChapterLine, htmlOfChapter } from "./analyse/chapter.ts";
import { parseWordLine, htmlOfWord } from "./analyse/word.ts";
import { loadPrivateMapping } from "./pe2-text.ts";

const PUG_SHELL = `doctype html
html
  head 
    meta(charset='utf8')
  body
    

`;

type Inside = "chapter" | "word" | null;

function processBuffer(
  buf: string[],
  inside: Inside,
  results: DicBlock[],
  root: string,
): void {
  const text = buf.join("");
  const mapping = loadPrivateMapping(root);
  if (inside === "chapter") {
    const entry = parseChapterLine(text, mapping);
    if (entry) results.push({ kind: "chapter", chapter: entry });
    else console.error("unanalyzed chapter", text.slice(0, 120));
  } else if (inside === "word") {
    const entry = parseWordLine(text, root);
    if (entry) {
      const last = results.at(-1);
      if (last?.kind === "word" && last.entry === entry.entry) {
        last.heteronyms.push(entry);
      } else {
        results.push({ kind: "word", entry: entry.entry, heteronyms: [entry] });
      }
    } else console.error("unanalyzed word", text.slice(0, 120));
  } else if (text.trim()) {
    console.error("unanalyzed", text.slice(0, 120));
  }
}

function renderBlocks(blocks: DicBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === "chapter") parts.push(htmlOfChapter(b.chapter).trimEnd());
    else {
      for (const h of b.heteronyms) parts.push(htmlOfWord(h).trimEnd());
    }
  }
  return parts.join("\n\n");
}

/** Stage 1: UTF-8 recoded .dic text → pre-unescape Pug body (matches dic2jade.py). */
export function dicTextToPugBody(dicUtf8: string, root: string): string {
  const results: DicBlock[] = [];
  let buf: string[] = [];
  let inside: Inside = null;

  for (const raw of dicUtf8.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith(".章首")) {
      if (buf.length > 0) processBuffer(buf, inside, results, root);
      buf = [];
      inside = "chapter";
    } else if (line.startsWith("~t96;")) {
      if (buf.length > 0) processBuffer(buf, inside, results, root);
      buf = [line];
      inside = "word";
    } else if (line.startsWith(".本文")) {
      if (buf.length > 0) processBuffer(buf, inside, results, root);
      buf = [];
      inside = null;
    } else if (inside) {
      buf.push(line);
    }
  }
  if (buf.length > 0) processBuffer(buf, inside, results, root);

  return PUG_SHELL + renderBlocks(results);
}