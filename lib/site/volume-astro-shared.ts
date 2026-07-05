import { chineseNumeral } from "../compile-pug.ts";
import { legacyPlainText } from "./structured-render.ts";
import type { RailSection } from "./volume-rail.ts";

export interface DocMeta {
  zh: string;
  file: string;
  kind: "prose" | "file";
  desc: string;
}

export const APPENDIX: Record<string, DocMeta> = {
  preface1: {
    zh: "編輯緣起・凡例",
    file: "PREFACE1.DIC",
    kind: "prose",
    desc: "吳守禮自述編纂始末（代序），附全書凡例。",
  },
  phsource: {
    zh: "華語台語注音符號溯源",
    file: "PHSOURCE",
    kind: "prose",
    desc: "注音符號與臺灣方音符號的來歷考述。",
  },
  "ph-comp": {
    zh: "方音音標對照表",
    file: "PH-COMP.TXT",
    kind: "file",
    desc: "漢注、華臺、TLPA、國際音標、甘典、漢閩諸系統對照。",
  },
  mytaiin8: {
    zh: "綜合閩方言拼音總表",
    file: "MYTAIIN8",
    kind: "file",
    desc: "閩方言拼音系統總表。",
  },
  "dic-cont": {
    zh: "辭典內容說明",
    file: "DIC-CONT.TXT",
    kind: "file",
    desc: "原始檔案內容一覽。",
  },
};

export const APPENDIX_IDS = Object.keys(APPENDIX);

export function volumeNav(
  volNo: number,
  href: (path?: string) => string,
): { prev: string | null; next: string | null; volName: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    volName: `卷${chineseNumeral(volNo)}`,
    prev: volNo > 1 ? pad(volNo - 1) : null,
    next: volNo < 26 ? pad(volNo + 1) : null,
  };
}

export function volumeRangeText(railSections: RailSection[]): string {
  if (railSections.length === 0) return "";
  const range = `${railSections[0]!.syllable}～${railSections[railSections.length - 1]!.syllable}`;
  return legacyPlainText(range);
}