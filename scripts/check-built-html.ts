import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { VOLUME_IDS } from "../lib/dic/pipeline.ts";
import {
  listBuiltDictionaryPages,
  verifyBuiltHtmlAnchors,
} from "../lib/site/anchor-integrity.ts";

const dist = join(process.cwd(), "dist");
const siteBase = "/koktai/";

const ASTRAL_PUA = /[\u{f0000}-\u{fffff}]/u;
const RAW_K_TAG = /<\/?k>/;
const IMG_REF = /(?:\.\/)?img\/(k|m3)\/([0-9a-f]+)\.png/g;

const failures: string[] = [];

const pages = listBuiltDictionaryPages(dist);
const volumePages = pages.filter((p) => VOLUME_IDS.includes(p.vol));

if (volumePages.length === 0) {
  failures.push(
    "no built dictionary pages in dist/ — expected split (01.html, 01/N.html) or legacy monolith",
  );
} else {
  for (const p of volumePages) {
    const label = p.rel;
    const path = join(dist, p.rel);
    const html = readFileSync(path, "utf8");

    const match = ASTRAL_PUA.exec(html);
    if (match?.index !== undefined) {
      const start = Math.max(0, match.index - 80);
      const end = Math.min(html.length, match.index + 80);
      failures.push(`${label} contains raw astral PUA near: ${html.slice(start, end)}`);
    }

    const rawK = RAW_K_TAG.exec(html);
    if (rawK?.index !== undefined) {
      const start = Math.max(0, rawK.index - 80);
      const end = Math.min(html.length, rawK.index + 80);
      failures.push(`${label} contains raw <k> markup near: ${html.slice(start, end)}`);
    }

    for (const [, font, code] of html.matchAll(IMG_REF)) {
      const ref = join(dist, "img", font!, `${code}.png`);
      if (!existsSync(ref)) failures.push(`${label} references missing ${font}/${code}.png`);
    }
  }

  failures.push(...verifyBuiltHtmlAnchors(dist, siteBase));
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

const split = volumePages.some((p) => p.section !== null);
const mode = split ? "section-split" : "monolith";
console.log(
  `checked ${volumePages.length} dictionary pages (${mode}): PUA, <k>, images, internal entry anchors`,
);