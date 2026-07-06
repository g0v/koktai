/**
 * Astro `base: './'` still emits `/./_astro/…` in HTML and `url(/_astro/…)` in CSS.
 * Rewrite to depth-relative HTML links and CSS-relative font URLs.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");

function upPrefix(depth: number): string {
  return depth === 0 ? "./" : "../".repeat(depth);
}

function pageDepth(relHtml: string): number {
  const rel = relHtml.replace(/^\.\//, "");
  if (rel === "index.html") return 0;
  const dir = rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
  return dir.split("/").filter(Boolean).length;
}

function walkHtml(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(p).isDirectory()) {
      if (rel === "sections") continue;
      out.push(...walkHtml(p, rel));
    } else if (name.endsWith(".html")) {
      out.push(rel);
    }
  }
  return out;
}

let htmlFixed = 0;
for (const rel of walkHtml(dist)) {
  const path = join(dist, rel);
  let html = readFileSync(path, "utf8");
  const up = upPrefix(pageDepth(rel));
  const next = html
    .replaceAll('href="/koktai/_astro/', `href="${up}_astro/`)
    .replaceAll('src="/koktai/_astro/', `src="${up}_astro/`)
    .replaceAll('href="/./_astro/', `href="${up}_astro/`)
    .replaceAll('src="/./_astro/', `src="${up}_astro/`)
    .replaceAll('href="/_astro/', `href="${up}_astro/`)
    .replaceAll('src="/_astro/', `src="${up}_astro/`)
    .replaceAll('href="/koktai/', `href="${up}`)
    .replaceAll('href="/./', `href="${up}`)
    .replaceAll('src="/./', `src="${up}`);
  if (next !== html) {
    writeFileSync(path, next);
    htmlFixed++;
  }
}

const astroDir = join(dist, "_astro");
let cssFixed = 0;
if (statSync(astroDir).isDirectory()) {
  for (const name of readdirSync(astroDir)) {
    if (!name.endsWith(".css")) continue;
    const path = join(astroDir, name);
    let css = readFileSync(path, "utf8");
    const next = css.replaceAll("url(/_astro/", "url(./");
    if (next !== css) {
      writeFileSync(path, next);
      cssFixed++;
    }
  }
}

console.log(`relativize-dist-assets: ${htmlFixed} html, ${cssFixed} css`);