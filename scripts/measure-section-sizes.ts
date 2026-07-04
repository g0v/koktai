#!/usr/bin/env bun
/** Writes lib/site/section-sizes.json for tighter scroll estimates (optional). */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { VOLUME_IDS } from "../lib/dic/pipeline.ts";
import { getStructuredVolume } from "../lib/site/structured-volume.ts";
import { renderStructuredSectionBody } from "../lib/site/structured-render.ts";
import { getCorpus } from "../lib/site/corpus.ts";
import { buildRailSections } from "../lib/site/volume-rail.ts";

const root = join(import.meta.dir, "..");
const linkCtx = { resolver: getCorpus(root).resolver, hrefBase: "/koktai/" };
const sizeTable: Record<string, Record<string, number>> = {};

for (const vol of VOLUME_IDS) {
  const structured = getStructuredVolume(root, vol);
  const rails = buildRailSections(root, vol);
  sizeTable[vol] = {};
  for (let i = 0; i < structured.sections.length; i++) {
    const section = structured.sections[i]!;
    const rail = rails[i]!;
    const bodyHtml = renderStructuredSectionBody(section, linkCtx);
    const entryNodes = (bodyHtml.match(/class="entry /g) ?? []).length;
    sizeTable[vol]![rail.id] = Math.max(280, entryNodes * 9 + rail.sinogramCount * 24);
  }
}

writeFileSync(
  join(root, "lib/site/section-sizes.json"),
  JSON.stringify(sizeTable),
  "utf8",
);
console.log("wrote lib/site/section-sizes.json");