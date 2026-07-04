/** Suggest row tuple from search-data / suggest.json (see search-box). */
export type KoktaiSuggestRow = [t: string, z: string, v: string, l: number, k: 0 | 1, s: number, h?: string];

declare global {
  interface Window {
    __koktaiSuggest?: KoktaiSuggestRow[];
  }
}

export {};