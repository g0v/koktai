#!/usr/bin/env bun
// Compare committed img PNGs (before) to working-tree (after regen).
// Set CHANGED_ONLY=1 to compare only files git reports as modified under img/.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const baselineDir = join(root, "font", "_pixel_baseline");

type Rgba = { r: number; g: number; b: number; a: number };

async function loadRgba(path: string): Promise<{ w: number; h: number; data: Buffer }> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

function isInk(p: Rgba): boolean {
  if (p.a < 8) return false;
  return p.r < 240 || p.g < 240 || p.b < 240;
}

function isBackground(p: Rgba): boolean {
  return p.r >= 240 && p.g >= 240 && p.b >= 240;
}

function listPaths(): string[] {
  if (process.env.CHANGED_ONLY === "1") {
    const r = spawnSync("git", ["diff", "--name-only", "HEAD", "--", "img/"], {
      cwd: root,
      encoding: "utf8",
    });
    if (r.status !== 0) throw new Error(r.stderr || "git diff failed");
    return r.stdout
      .trim()
      .split("\n")
      .filter((l) => l.endsWith(".png"));
  }
  const r = spawnSync("git", ["ls-files", "img/k", "img/m3"], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || "git ls-files failed");
  return r.stdout
    .trim()
    .split("\n")
    .filter((l) => l.endsWith(".png"));
}

function gitShowBlob(gitPath: string): Buffer | null {
  const r = spawnSync("git", ["show", `HEAD:${gitPath}`], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) return null;
  return r.stdout;
}

async function comparePair(
  beforePath: string,
  afterPath: string,
): Promise<{ strictEqual: boolean; inkEqual: boolean; inkDiffs: number; strictDiffs: number; note?: string }> {
  const before = await loadRgba(beforePath);
  const after = await loadRgba(afterPath);
  if (before.w !== after.w || before.h !== after.h) {
    return { strictEqual: false, inkEqual: false, inkDiffs: -1, strictDiffs: -1, note: "dimensions" };
  }
  const n = before.w * before.h;
  let strictDiffs = 0;
  let inkDiffs = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const b: Rgba = {
      r: before.data[o]!,
      g: before.data[o + 1]!,
      b: before.data[o + 2]!,
      a: before.data[o + 3]!,
    };
    const a: Rgba = {
      r: after.data[o]!,
      g: after.data[o + 1]!,
      b: after.data[o + 2]!,
      a: after.data[o + 3]!,
    };
    if (b.r !== a.r || b.g !== a.g || b.b !== a.b || b.a !== a.a) strictDiffs++;

    const bInk = isInk(b);
    const aInk = isInk(a);
    if (bInk !== aInk) {
      inkDiffs++;
      continue;
    }
    if (bInk && (b.r !== a.r || b.g !== a.g || b.b !== a.b)) inkDiffs++;
    else if (!bInk && !aInk && isBackground(b) && isBackground(a)) {
      // opaque white vs transparent white
    } else if (!bInk && !aInk && (b.r !== a.r || b.g !== a.g || b.b !== a.b || b.a !== a.a)) {
      inkDiffs++;
    }
  }
  return { strictEqual: strictDiffs === 0, inkEqual: inkDiffs === 0, inkDiffs, strictDiffs };
}

mkdirSync(baselineDir, { recursive: true });

const paths = listPaths();
const limit = Number(process.env.LIMIT ?? "0");
const list = limit > 0 ? paths.slice(0, limit) : paths;

let strictOk = 0;
let inkOk = 0;
const failures: string[] = [];

for (let i = 0; i < list.length; i++) {
  const gitPath = list[i]!;
  const afterPath = join(root, gitPath);
  const blob = gitShowBlob(gitPath);
  if (!blob) continue;
  const beforePath = join(baselineDir, gitPath.replace(/\//g, "_"));
  mkdirSync(dirname(beforePath), { recursive: true });
  writeFileSync(beforePath, blob);

  const r = await comparePair(beforePath, afterPath);
  if (r.strictEqual) strictOk++;
  if (r.inkEqual) inkOk++;
  if (!r.inkEqual) {
    failures.push(`${gitPath} strict=${r.strictDiffs} ink=${r.inkDiffs} ${r.note ?? ""}`);
  }
  if ((i + 1) % 200 === 0) process.stdout.write(`\rcompared ${i + 1}/${list.length}`);
}

console.log();
console.log(
  JSON.stringify(
    {
      mode: process.env.CHANGED_ONLY === "1" ? "changed-only" : "all-listed",
      compared: list.length,
      strictIdentical: strictOk,
      inkIdentical: inkOk,
      inkFailures: failures.length,
      sampleFailures: failures.slice(0, 25),
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);