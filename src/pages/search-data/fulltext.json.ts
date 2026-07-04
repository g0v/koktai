import type { APIRoute } from "astro";
import { getCorpus } from "../../../lib/site/corpus.ts";
import { buildFulltextRows } from "../../../lib/site/search-data.ts";

export const GET: APIRoute = () => {
  const rows = buildFulltextRows(getCorpus(process.cwd()));
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};