/** Site root URL for fetch/XHR — `data-base` must be depth-aware (`./`, `../`, `../../`). */
export function siteRootUrl(prefix: string): string {
  const p = prefix.trim() || "./";
  const root = new URL(p, location.href);
  const path = root.pathname.endsWith("/") ? root.pathname : `${root.pathname}/`;
  return `${root.origin}${path}`;
}

export function fetchFromSiteRoot(prefix: string, path: string): Promise<Response> {
  const clean = path.replace(/^\//, "");
  return fetch(new URL(clean, siteRootUrl(prefix)).href);
}