import { describe, expect, test } from "bun:test";
import { getCorpus } from "../../lib/site/corpus.ts";
import {
  verifyCorpusSectionRouting,
  verifyTargetHrefRouting,
} from "../../lib/site/anchor-integrity.ts";
import { getStructuredVolume } from "../../lib/site/structured-volume.ts";
import { buildRailSections } from "../../lib/site/volume-rail.ts";
import { renderStructuredSection } from "../../lib/site/structured-render.ts";
import { entryAnchor } from "../../lib/site/volume-paths.ts";

const root = import.meta.dir + "/../..";

describe("anchor integrity (corpus routing)", () => {
  test(
    "every entry maps to a syllable section",
    () => {
      const corpus = getCorpus(root);
      const errors = verifyCorpusSectionRouting(corpus);
      expect(errors).toEqual([]);
    },
    30_000,
  );

  test(
    "targetPageHref section matches entry-index for all entries",
    () => {
      const corpus = getCorpus(root);
      const errors = verifyTargetHrefRouting(corpus, "/koktai/");
      expect(errors).toEqual([]);
    },
    30_000,
  );

  test("rendered section HTML contains entry anchors (spot: vol 02)", () => {
    const corpus = getCorpus(root);
    const hrefBase = "/koktai/";
    const linkCtx = { resolver: corpus.resolver, hrefBase, corpus };
    const vol = "02";
    const structured = getStructuredVolume(root, vol);
    const rails = buildRailSections(root, vol);
    for (let i = 0; i < structured.sections.length; i++) {
      const section = structured.sections[i]!;
      const rail = rails[i]!;
      const html = renderStructuredSection(
        section,
        {
          id: rail.id,
          syllable: rail.syllable,
          roman: rail.roman ?? "",
          note: "",
        },
        linkCtx,
      );
      const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!));
      for (const e of section.entries) {
        expect(ids.has(entryAnchor("w", e.line))).toBe(true);
      }
      for (const s of section.sinograms) {
        expect(ids.has(entryAnchor("c", s.line))).toBe(true);
      }
    }
  }, 120_000);
});