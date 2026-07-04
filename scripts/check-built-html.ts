import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VOLUME_IDS } from "../lib/dic/pipeline.ts";

const ASTRAL_PUA = /[\u{f0000}-\u{fffff}]/u;

const failures: string[] = [];
for (const volume of VOLUME_IDS) {
  const path = join(process.cwd(), "dist", `${volume}.html`);
  const html = readFileSync(path, "utf8");
  const match = ASTRAL_PUA.exec(html);
  if (match?.index === undefined) continue;
  const start = Math.max(0, match.index - 80);
  const end = Math.min(html.length, match.index + 80);
  failures.push(`${volume}.html contains raw astral PUA near: ${html.slice(start, end)}`);
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

console.log(`checked ${VOLUME_IDS.length} built volume pages: no raw astral PUA`);
