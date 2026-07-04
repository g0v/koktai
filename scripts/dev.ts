/**
 * Static file server for dist/ (Bun).
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.env.PORT ?? 4173);

const types: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  woff: "font/woff",
  png: "image/png",
  json: "application/json",
};

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(dist, path.replace(/^\//, "")));
    if (await file.exists()) {
      const ext = path.split(".").pop() ?? "";
      return new Response(file, {
        headers: { "Content-Type": types[ext] ?? "application/octet-stream" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Koktai preview: http://localhost:${server.port}/`);
console.log(`  01.html: http://localhost:${server.port}/01.html`);