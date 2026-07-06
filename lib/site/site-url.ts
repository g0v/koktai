import {
  isRelativeSiteBase,
  pagePathDepth,
  relativeAssetFromSection,
  relativeAssetFromVolumeHub,
  relativeDictionaryEntryHref,
  relativeSitePageHref,
  upSegments,
} from "./relative-url.ts";
import { volumeHubPath, volumeSectionPath } from "./volume-paths.ts";

/** Prefix from a built page to site root (`./`, `../`, `../../`, …). */
export function siteRootPrefixForPage(pagePath: string): string {
  const depth = pagePathDepth(pagePath);
  return depth === 0 ? "./" : upSegments(depth);
}

/** Join site-root prefix with a path under dist (no leading slash). */
export function siteUrlFromRoot(prefix: string, path = ""): string {
  if (!path) return prefix === "./" ? "./" : prefix;
  if (path.startsWith("#")) {
    return depthFromPrefix(prefix) === 0 ? path : `index.html${path}`;
  }
  const clean = path.replace(/^\//, "");
  return `${prefix}${clean}`;
}

function depthFromPrefix(prefix: string): number {
  if (prefix === "./" || prefix === "") return 0;
  return (prefix.match(/\.\.\//g) ?? []).length;
}

/** Nav / static link from `fromPage` to `targetPath` (e.g. `01/3/index.html`, `#volumes`). */
export function pageLink(fromPage: string, targetPath: string): string {
  const fromDepth = pagePathDepth(fromPage);
  const hashIdx = targetPath.indexOf("#");
  const pagePart = hashIdx >= 0 ? targetPath.slice(0, hashIdx) : targetPath;
  const hash = hashIdx >= 0 ? targetPath.slice(hashIdx) : "";
  if (hash && pagePart === fromPage) return hash;
  if (targetPath.startsWith("#")) {
    return fromDepth === 0 ? targetPath : `${upSegments(fromDepth)}index.html${targetPath}`;
  }
  const rel = relativeSitePageHref(fromDepth, pagePart || targetPath);
  return hash ? `${rel}${hash}` : rel;
}

export function homePagePath(): string {
  return "index.html";
}

export function appendixPagePath(slug: string): string {
  return `${slug}/index.html`;
}

export { isRelativeSiteBase, relativeDictionaryEntryHref, relativeAssetFromSection, relativeAssetFromVolumeHub };

/** Rewrite snapshot HTML generated with absolute `/koktai/` or `/` paths to page-relative links. */
export function relativizeDictionarySnapshotHtml(
  html: string,
  fromVol: string,
  fromSection: number,
): string {
  const fromPage = volumeSectionPath(fromVol, fromSection);
  const fromDepth = pagePathDepth(fromPage);
  const up = upSegments(fromDepth);

  let out = html;
  // Entry hrefs: /koktai/21/24/index.html#c-1 or /21/24/index.html#w-2
  out = out.replace(
    /href="(?:\/koktai\/)?(0[1-9]|1[0-9]|2[0-6])\/(\d+)\/index\.html#([wc]-\d+)"/g,
    (_m, vol: string, sec: string, anchor: string) => {
      const target = volumeSectionPath(vol, Number(sec));
      if (target === fromPage) return `href="#${anchor}"`;
      return `href="${relativeSitePageHref(fromDepth, target)}#${anchor}"`;
    },
  );
  out = out.replace(
    /href="(?:\/koktai\/)?(0[1-9]|1[0-9]|2[0-6])\/index\.html#([wc]-\d+)"/g,
    (_m, vol: string, anchor: string) => {
      const target = volumeHubPath(vol);
      return `href="${relativeSitePageHref(fromDepth, target)}#${anchor}"`;
    },
  );
  // Images: img/k/… under site root
  out = out.replace(/src=(["'])(?:\/koktai\/)?img\/(k|m3)\//g, `src=$1${up}img/$2/`);
  return out;
}