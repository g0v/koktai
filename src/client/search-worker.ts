/// <reference lib="webworker" />

import Fuse from "fuse.js";
import type { FuseResult } from "fuse.js";
import type { FromWorker, ToWorker } from "./protocol.ts";
import { buildSnippetAround } from "./search-matching.ts";

type FulltextRow = [t: string, v: string, l: number, k: 0 | 1, d: string];

type FulltextDoc = {
  t: string;
  v: string;
  l: number;
  k: 0 | 1;
  d: string;
};

let fuse: Fuse<FulltextDoc> | undefined;
let loadPromise: Promise<void> | undefined;
let cachedBase = "";

function post(msg: FromWorker): void {
  self.postMessage(msg);
}

function snippetFromResult(result: FuseResult<FulltextDoc>): string {
  const doc = result.item;
  const matches = result.matches ?? [];
  for (const m of matches) {
    if (m.key !== "d" && m.key !== "t") continue;
    const indices = m.indices ?? [];
    if (indices.length === 0) continue;
    const [start, end] = indices[0]!;
    const field = m.key === "t" ? doc.t : doc.d;
    return buildSnippetAround(field, start, end + 1);
  }
  const slice = doc.d.slice(0, 90);
  return buildSnippetAround(slice, 0, Math.min(slice.length, 40));
}

async function ensureIndex(base: string): Promise<Fuse<FulltextDoc>> {
  if (fuse && cachedBase === base) return fuse;
  if (loadPromise && cachedBase === base) {
    await loadPromise;
    return fuse!;
  }
  cachedBase = base;
  const url = `${base.endsWith("/") ? base : `${base}/`}search-data/fulltext.json`;
  loadPromise = (async () => {
    post({ type: "status", phase: "fetching" });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fulltext fetch ${res.status}`);
    const rows = (await res.json()) as FulltextRow[];
    const docs = rows.map(([t, v, l, k, d]) => ({ t, v, l, k, d }));
    post({ type: "status", phase: "indexing" });
    fuse = new Fuse(docs, {
      keys: [
        { name: "t", weight: 3 },
        { name: "d", weight: 1 },
      ],
      includeMatches: true,
      ignoreLocation: true,
      threshold: 0.25,
      minMatchCharLength: 2,
    });
    post({ type: "status", phase: "ready" });
  })();
  await loadPromise;
  return fuse!;
}

self.addEventListener("message", (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (!msg || msg.type !== "query") return;
  const q = msg.q.trim();
  if (q.length < 2) {
    post({ type: "results", q, items: [] });
    return;
  }
  void (async () => {
    try {
      const index = await ensureIndex(msg.base);
      const hits = index.search(q, { limit: msg.limit });
      const items = hits.map((r) => ({
        t: r.item.t,
        v: r.item.v,
        l: r.item.l,
        k: r.item.k,
        snippet: snippetFromResult(r),
      }));
      post({ type: "results", q, items });
    } catch {
      post({ type: "results", q, items: [] });
    }
  })();
});