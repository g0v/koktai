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
  out = out.replace(/href="\/koktai\//g, `href="${b}`);
  out = out.replace(/src="\/koktai\/img\//g, `src="${b}img/`);
  if (b !== "/") {
    out = out.replace(/href="\/(0[1-9]|1[0-9]|2[0-6])\//g, `href="${b}$1/`);
    out = out.replace(/href="\/(0[1-9]|1[0-9]|2[0-6])\/index\.html/g, `href="${b}$1/index.html`);
  }
  return out;
}