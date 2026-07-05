import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Trailing slash, for concatenating `base + "01/3/index.html"`. */
export function normalizeSiteBase(base: string): string {
  if (!base || base === "/") return "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/** Read `base` from `astro.config.mjs` (build-time / snapshot scripts). */
export function readAstroBaseFromConfig(root: string): string {
  const raw = readFileSync(join(root, "astro.config.mjs"), "utf8");
  const m = raw.match(/base:\s*["']([^"']*)["']/);
  const configured = m?.[1] ?? "/";
  return normalizeSiteBase(configured === "" ? "/" : configured.startsWith("/") ? configured : `/${configured}`);
}

/**
 * Rebase dictionary snapshot markup to the active site prefix (Astro `import.meta.env.BASE_URL`).
 * Snapshots may have been generated with a different configured base.
 */
export function rebaseDictionarySnapshotHtml(html: string, targetBase: string): string {
  const b = normalizeSiteBase(targetBase);
  let out = html;
  // Entry links: snapshots may have been built with a different href prefix.
  out = out.replace(/href="\/koktai\//g, `href="${b}`);
  if (b !== "/") {
    out = out.replace(/href="\/(0[1-9]|1[0-9]|2[0-6])\//g, `href="${b}$1/`);
    out = out.replace(/href="\/(0[1-9]|1[0-9]|2[0-6])\/index\.html/g, `href="${b}$1/index.html`);
  }
  // Glyph images: always under site base (never leave /img/ at domain root when mounted at /koktai/).
  out = out.replace(/src="\/(?:koktai\/)?img\/(k|m3)\//g, `src="${b}img/$1/`);
  out = out.replace(/src=(["'])(?:\/koktai\/)?img\/(k|m3)\//g, `src=$1${b}img/$2/`);
  return out;
}