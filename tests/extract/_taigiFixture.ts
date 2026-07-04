import { recodeDicFile } from "../../lib/dic/cp950.ts";
import { splitVolume } from "../../lib/extract/blocks.ts";
import { parseWordLine } from "../../lib/dic/analyse/word.ts";

export function taigiFromWordLine(text: string, root: string): string {
  const entry = parseWordLine(text, root);
  if (!entry) return "";
  for (const s of entry.sentences) {
    if (s.lang === "台") return s.sentence;
    const inline = s.sentence.match(/\(台\)(.+)$/u);
    if (inline) return inline[1]!;
    if (text.includes("[序位]")) {
      const tail = s.sentence.match(/。第(.+?)。?$/u);
      if (tail) return `第${tail[1]!}`;
    }
  }
  return "";
}

export function taigiOf(volFile: string, match: (t: string) => boolean, root: string): string {
  const v = splitVolume(recodeDicFile(volFile));
  const w = v.words.find((w) => match(w.text))!;
  return taigiFromWordLine(w.text, root);
}