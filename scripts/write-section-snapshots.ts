#!/usr/bin/env bun
/**
 * Pre-render syllable section HTML for `public/sections/<vol>/<n>/index.html`.
 * Run before `astro build` (wired in package.json `build`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VOLUME_IDS } from "../lib/dic/pipeline.ts";
import { getCorpus } from "../lib/site/corpus.ts";
import { getStructuredVolume } from "../lib/site/structured-volume.ts";
import { buildRailSections } from "../lib/site/volume-rail.ts";
import { loadSectionSizes, estimateSectionPx } from "../lib/site/section-sizes.ts";
import {
  buildSectionEntryIndex,
  volumeSectionPath,
} from "../lib/site/volume-paths.ts";
import { renderStructuredSection } from "../lib/site/structured-render.ts";

const root = process.cwd();
const outRoot = join(root, "public", "sections");
const corpus = getCorpus(root);
const hrefBase = "/koktai/";

mkdirSync(outRoot, { recursive: true });

let files = 0;
for (const vol of VOLUME_IDS) {
  const structured = getStructuredVolume(root, vol);
  const rails = buildRailSections(root, vol);
  const sizes = loadSectionSizes(root);
  const linkCtx = { resolver: corpus.resolver, hrefBase, corpus };

  for (let i = 0; i < structured.sections.length; i++) {
    const section = structured.sections[i]!;
    const rail = rails[i]!;
    const html = renderStructuredSection(
      section,
      {
        id: rail.id,
        syllable: rail.syllable,
        roman: rail.roman ?? "",
        note: rail.note ?? "",
        intrinsicPx: estimateSectionPx(
          sizes,
          vol,
          rail.id,
          rail.entryCount,
          rail.sinogramCount,
        ),
      },
      linkCtx,
    );
    const rel = volumeSectionPath(vol, i + 1);
    const outPath = join(outRoot, rel);
    mkdirSync(join(outPath, ".."), { recursive: true });
    writeFileSync(outPath, html, "utf8");
    files++;
  }
}

const index = buildSectionEntryIndex(corpus);
writeFileSync(join(outRoot, "entry-index.json"), `${JSON.stringify(index)}\n`, "utf8");
console.log(`wrote ${files} section snapshots + entry-index.json under public/sections/`);