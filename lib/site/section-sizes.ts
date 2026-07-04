import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type SectionSizeTable = Record<string, Record<string, number>>;

const DEFAULT_PX = 480;

export function loadSectionSizes(root: string): SectionSizeTable {
  const path = join(root, "lib/site/section-sizes.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as SectionSizeTable;
}

export function estimateSectionPx(
  table: SectionSizeTable,
  vol: string,
  sectionId: string,
  entryCount: number,
  sinogramCount: number,
): number {
  const hit = table[vol]?.[sectionId];
  if (hit && hit > 0) return hit;
  return Math.max(320, 120 + entryCount * 72 + sinogramCount * 200);
}

export { DEFAULT_PX };