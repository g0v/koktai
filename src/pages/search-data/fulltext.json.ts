import type { APIRoute } from "astro";
import { getCorpus } from "../../../lib/site/corpus.ts";
import { buildFulltextDocs } from "../../../lib/site/search-data.ts";

export const GET: APIRoute = () => {
  const docs = buildFulltextDocs(getCorpus(process.cwd()));
  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};