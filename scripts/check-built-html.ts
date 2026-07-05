import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { VOLUME_IDS } from "../lib/dic/pipeline.ts";

const ASTRAL_PUA = /[\u{f0000}-\u{fffff}]/u;
const RAW_K_TAG = /<\/?k>/;
const IMG_REF = /(?:\.\/)?img\/(k|m3)\/([0-9a-f]+)\.png/g;


const failures: string[] = [];
for (const volume of VOLUME_IDS) {
  const path = join(process.cwd(), "dist", `${volume}.html`);
  const html = readFileSync(path, "utf8");
  const match = ASTRAL_PUA.exec(html);
  if (match?.index !== undefined) {
    const start = Math.max(0, match.index - 80);
    const end = Math.min(html.length, match.index + 80);
    failures.push(`${volume}.html contains raw astral PUA near: ${html.slice(start, end)}`);
  }

  const rawK = RAW_K_TAG.exec(html);
  if (rawK?.index !== undefined) {
    const start = Math.max(0, rawK.index - 80);
    const end = Math.min(html.length, rawK.index + 80);
    failures.push(`${volume}.html contains raw <k> markup near: ${html.slice(start, end)}`);
  }

  for (const [, font, code] of html.matchAll(IMG_REF)) {
    const ref = join(process.cwd(), "dist", "img", font!, `${code}.png`);
    if (!existsSync(ref)) failures.push(`${volume}.html references missing ${font}/${code}.png`);
  }
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

console.log(`checked ${VOLUME_IDS.length} built volume pages: no raw astral PUA, raw <k> markup, or missing glyph images`);
