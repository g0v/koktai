import type { APIRoute } from "astro";
import { getCorpus } from "../../../lib/site/corpus.ts";
import { buildSuggestRows } from "../../../lib/site/search-data.ts";

export const GET: APIRoute = () => {
  const rows = buildSuggestRows(getCorpus(process.cwd()));
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};