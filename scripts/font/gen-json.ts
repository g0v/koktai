#!/usr/bin/env bun
/** CLI: `bun run gen:font-json -- k|m3` */
import { join } from "node:path";
import { writeFontJson } from "../../lib/font/gen-json.ts";

const font = (process.argv[2] ?? "").trim();
if (font !== "k" && font !== "m3") {
  console.error("usage: bun run gen:font-json -- <k|m3>");
  process.exit(1);
}
const root = join(import.meta.dir, "../..");
writeFontJson(root, font);