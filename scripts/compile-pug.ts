/**
 * Compile pug/ → dist/*.html (legacy flat export; Astro build uses lib/compile-pug.ts).
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compileAllPug } from "../lib/compile-pug.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist");

const { ok, fail } = compileAllPug(root, outDir);
console.log(`\nCompiled ${ok} pages${fail ? `, ${fail} failed` : ""} → dist/`);
if (fail) process.exit(1);