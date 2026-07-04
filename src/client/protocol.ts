export type ToWorker = {
  type: "query";
  q: string;
  limit: number;
  base: string;
};

export type FulltextHit = {
  t: string;
  v: string;
  l: number;
  k: 0 | 1;
  snippet: string;
};

export type FromWorker =
  | { type: "status"; phase: "fetching" | "indexing" | "ready" }
  | { type: "results"; q: string; items: FulltextHit[] };

export type SuggestRow = [t: string, z: string, v: string, l: number, k: 0 | 1, s: number, h?: string];