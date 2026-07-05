#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { getCorpus } from "../lib/site/corpus.ts";
import {
  buildFulltextRows,
  buildSuggestRows,
  type FulltextRow,
  type SuggestRow,
} from "../lib/site/search-data.ts";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");

const suggestPath = join(dist, "search-data/suggest.json");
const suggest = JSON.parse(readFileSync(suggestPath, "utf8")) as SuggestRow[];
const expectedSuggest = buildSuggestRows(getCorpus(root));
if (suggest.length !== expectedSuggest.length) {
  throw new Error(
    `suggest row count ${suggest.length} !== ${expectedSuggest.length}`,
  );
}
if (
  !suggest.some((r) => r[0] === "喇叭" && r[2] === "01" && r[3] === 182) ||
  !suggest.some((r) => r[0] === "喇叭" && r[2] === "08" && r[3] === 277)
) {
  throw new Error("suggest.json missing 喇叭 rows for 01/182 and 08/277");
}

const fulltextPath = join(dist, "search-data/fulltext.json");
const fulltextRaw = readFileSync(fulltextPath, "utf8");
const fulltext = JSON.parse(fulltextRaw) as FulltextRow[];
const expectedFulltext = buildFulltextRows(getCorpus(root));
if (fulltext.length !== expectedFulltext.length) {
  throw new Error(
    `fulltext doc count ${fulltext.length} !== ${expectedFulltext.length}`,
  );
}
if (fulltext.length < 46_000) {
  throw new Error(`fulltext doc count ${fulltext.length} < 46000`);
}
const fulltextBudget = 9 * 1024 * 1024;
if (Buffer.byteLength(fulltextRaw) > fulltextBudget) {
  throw new Error(
    `fulltext raw size ${Buffer.byteLength(fulltextRaw)} exceeds ${fulltextBudget} bytes`,
  );
}
const kaiLeak = fulltext.find((row) => /<\/?k>|k>|(^|[^\p{L}\p{N}])k\s+[\p{Script=Han}]/u.test(row[4]));
if (kaiLeak) {
  throw new Error(`fulltext row ${kaiLeak[1]}/${kaiLeak[2]} contains leaked k-tag fragment`);
}

const vol01Sec = join(dist, "01", "1", "index.html");
if (!existsSync(vol01Sec)) {
  throw new Error("dist/01/1/index.html missing (section split)");
}
const vol01Html = readFileSync(vol01Sec, "utf8");
if (!vol01Html.includes('id="w-182"')) {
  throw new Error('dist/01/1/index.html missing id="w-182"');
}
if (!vol01Html.includes('id="c-309"')) {
  throw new Error('dist/01/1/index.html missing id="c-309"');
}
const crossVolKk = /class="kk"[^>]*href="[^"]*\/(0[2-9]|[12][0-9])\/\d+\/index\.html#/;
if (!crossVolKk.test(vol01Html)) {
  throw new Error("dist/01/1/index.html missing a.kk href targeting another volume section");
}

const astroDir = join(dist, "_astro");
const pageChunks = readdirSync(astroDir).filter(
  (f) => f.endsWith(".js") && !f.includes("worker"),
);
let pageGz = 0;
for (const f of pageChunks) {
  const buf = readFileSync(join(astroDir, f));
  const src = buf.toString("utf8");
  if (/\bfuse\b/i.test(src)) {
    throw new Error(`fuse identifier found in page chunk ${f}`);
  }
  pageGz += gzipSync(buf).length;
}
const pageGzBudget = 15 * 1024;
if (pageGz > pageGzBudget) {
  throw new Error(
    `page-level _astro JS gz ${pageGz} exceeds ${pageGzBudget} bytes`,
  );
}

console.log(
  `search dist gate ok: suggest=${suggest.length} fulltext=${fulltext.length} page_js_gz=${pageGz}`,
);