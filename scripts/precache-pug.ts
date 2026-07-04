/**
 * Compile all pug volumes in parallel (Bun workers) into .cache/pug/*.json.
 */
import { availableParallelism } from "node:os";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listPugPages, scanPugVolume } from "../lib/compile-pug.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bases = listPugPages(root);
const started = performance.now();

const workers = Math.min(availableParallelism(), bases.length, 10);
const queue = [...bases];
let done = 0;
let failed = 0;

await new Promise<void>((resolve) => {
  const workerUrl = new URL("./pug-worker.ts", import.meta.url);
  for (let i = 0; i < workers; i++) {
    const w = new Worker(workerUrl);
    const next = () => {
      const base = queue.shift();
      if (!base) {
        w.terminate();
        if (done + failed === bases.length) resolve();
        return;
      }
      w.postMessage({ root, base });
    };
    w.onmessage = (e: MessageEvent<{ base: string; ok: boolean; error?: string }>) => {
      if (e.data.ok) done++;
      else {
        failed++;
        console.error(`  FAIL ${e.data.base}: ${e.data.error}`);
      }
      if (done + failed === bases.length) {
        w.terminate();
        resolve();
        return;
      }
      next();
    };
    next();
  }
});

const ms = Math.round(performance.now() - started);
console.log(`precached ${done}/${bases.length} volumes in ${ms}ms (${workers} workers)`);
if (failed) process.exit(1);

let bad = 0;
for (const base of bases) {
  const scan = scanPugVolume(root, base);
  const cached = JSON.parse(
    readFileSync(join(root, ".cache/pug", `${base}.json`), "utf8"),
  ) as { sections: unknown[] };
  if (cached.sections.length !== scan.sections) {
    console.error(
      `  INVARIANT ${base}: transform sections ${cached.sections.length} != pug h2 ${scan.sections}`,
    );
    bad++;
  }
}
if (bad) process.exit(1);