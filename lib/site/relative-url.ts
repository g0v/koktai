import { volumeSectionPath } from "./volume-paths.ts";

/** True when Astro `base` is `./` (prefix-flexible static deploy). */
export function isRelativeSiteBase(base: string): boolean {
  const b = base.trim();
  return b === "./" || b === "." || b === "";
}

/** `01/15/index.html` → URL path depth (segments under site root). */
export function pagePathDepth(pagePath: string): number {
  const clean = pagePath.replace(/^\.\//, "").replace(/\/index\.html$/i, "");
  if (!clean || clean === "index.html") return 0;
  return clean.split("/").filter(Boolean).length;
}

/** Prefix of `../` repeated `n` times (`n === 0` → ``). */
export function upSegments(n: number): string {
  return n > 0 ? "../".repeat(n) : "";
}

/** Relative path from page at `fromDepth` to another page under site root (`targetPath` like `21/24/index.html`). */
export function relativeSitePageHref(fromDepth: number, targetPath: string): string {
  if (targetPath.startsWith("#")) {
    return fromDepth === 0 ? targetPath : `${upSegments(fromDepth)}index.html${targetPath}`;
  }
  return `${upSegments(fromDepth)}${targetPath}`;
}

/** Entry link from a dictionary section page (`fromVol`/`fromSection`) to a link target. */
export function relativeDictionaryEntryHref(
  fromVol: string,
  fromSection: number,
  targetVol: string,
  targetSection: number,
  anchor: string,
): string {
  const page = volumeSectionPath(targetVol, targetSection);
  const fromPage = volumeSectionPath(fromVol, fromSection);
  if (fromPage === page) return `#${anchor}`;
  const fromDepth = pagePathDepth(fromPage);
  return `${relativeSitePageHref(fromDepth, page)}#${anchor}`;
}

/** Glyph / static asset from a dictionary section page (`img/k/…`). */
export function relativeAssetFromSection(
  fromVol: string,
  fromSection: number,
  assetPath: string,
): string {
  const depth = pagePathDepth(volumeSectionPath(fromVol, fromSection));
  const clean = assetPath.replace(/^\//, "");
  return `${upSegments(depth)}${clean}`;
}

/** Glyph / static asset from volume hub (`01/index.html`). */
export function relativeAssetFromVolumeHub(assetPath: string): string {
  const clean = assetPath.replace(/^\//, "");
  return `../${clean}`;
}