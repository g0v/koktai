import { getVolumeData } from "../compile-pug.ts";
import type { SectionInfo } from "../compile-pug.ts";
import { getStructuredVolume } from "./structured-volume.ts";

export interface RailSection {
  id: string;
  syllable: string;
  roman: string;
  note: string;
  entryCount: number;
  sinogramCount: number;
}

const horizontalI = (s: string) => s.replaceAll("丨", "ㄧ");

export function buildRailSections(root: string, base: string): RailSection[] {
  const { sections: pugSections } = getVolumeData(root, base);
  const structured = getStructuredVolume(root, base);
  return structured.sections.map((sec, i) => {
    const syllable = horizontalI(sec.chapterZhuyin);
    const pugSec = pugSections.find(
      (s: SectionInfo) => s.syllable === syllable || s.syllable === sec.chapterZhuyin,
    );
    return {
      id: `s-${i + 1}`,
      syllable,
      roman: pugSec?.roman ?? "",
      note: "",
      entryCount: sec.entries.length,
      sinogramCount: sec.sinograms.length,
    };
  });
}