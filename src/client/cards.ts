/// <reference path="./koktai-global.d.ts" />

type Kind = "w" | "c";
type Target = { k: Kind; v: string; l: number };

const INTENT_MS = 120;
const DISMISS_MS = 200;
const MAX_DOCS = 4;
const MARGIN = 8;
const FLIP_THRESHOLD = 320;

const docCache = new Map<string, Document>();
const htmlCache = new Map<string, string>();
let activeAnchor: HTMLAnchorElement | null = null;
let card: HTMLElement | null = null;
let intentTimer = 0;
let dismissTimer = 0;
let pinned = false;

function baseUrl(): string {
  const fromSearch = document.querySelector<HTMLElement>("[data-koktai-search]")?.dataset.base;
  const base = fromSearch ?? "/koktai/";
  return base.endsWith("/") ? base : `${base}/`;
}

function parseTarget(a: HTMLAnchorElement): Target | undefined {
  const raw = a.dataset.kk;
  const m = raw?.match(/^(w|c):(\d\d):(\d+)$/);
  if (!m) return undefined;
  return { k: m[1] as Kind, v: m[2]!, l: Number(m[3]) };
}

function anchorId(t: Target): string {
  return `${t.k}-${t.l}`;
}
function targetKey(t: Target): string {
  return `${t.v}:${anchorId(t)}`;
}
function targetHref(t: Target): string {
  return `${baseUrl()}${t.v}.html#${anchorId(t)}`;
}

function ensureCard(): HTMLElement {
  if (card) return card;
  card = document.createElement("div");
  card.className = "kk-card";
  card.role = "status";
  card.hidden = true;
  card.addEventListener("mouseenter", () => window.clearTimeout(dismissTimer));
  card.addEventListener("mouseleave", scheduleDismiss);
  document.body.append(card);
  return card;
}

function positionCard(anchor: HTMLAnchorElement): void {
  const el = ensureCard();
  const r = anchor.getBoundingClientRect();
  const width = Math.min(420, window.innerWidth - MARGIN * 2);
  el.style.width = `${width}px`;
  const h = el.offsetHeight || 260;
  let top = r.bottom + MARGIN;
  if (window.innerHeight - r.bottom < FLIP_THRESHOLD) top = Math.max(MARGIN, r.top - h - MARGIN);
  const left = Math.min(Math.max(MARGIN, r.left), window.innerWidth - width - MARGIN);
  el.style.left = `${left}px`;
  el.style.top = `${Math.min(top, window.innerHeight - h - MARGIN)}px`;
}

function stripIds(root: Element): void {
  root.removeAttribute("id");
  for (const el of root.querySelectorAll("[id]")) el.removeAttribute("id");
}

async function loadVolume(v: string): Promise<Document> {
  const cached = docCache.get(v);
  if (cached) return cached;
  const res = await fetch(`${baseUrl()}${v}.html`);
  if (!res.ok) throw new Error(`volume ${v} fetch failed: ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  docCache.set(v, doc);
  while (docCache.size > MAX_DOCS) docCache.delete(docCache.keys().next().value!);
  return doc;
}

async function entryHtml(t: Target): Promise<string> {
  const key = targetKey(t);
  const cached = htmlCache.get(key);
  if (cached) return cached;
  const doc = await loadVolume(t.v);
  const node = doc.getElementById(anchorId(t));
  if (!node) throw new Error(`missing ${anchorId(t)} in ${t.v}.html`);
  const clone = node.cloneNode(true) as Element;
  stripIds(clone);
  const html = clone.outerHTML;
  htmlCache.set(key, html);
  return html;
}

function homographs(t: Target, title: string): string {
  const rows = window.__koktaiSuggest;
  if (!rows) return "";
  const matches = rows.filter((r) => r[0] === title && (r[2] !== t.v || r[3] !== t.l));
  if (matches.length === 0) return "";
  const links = matches
    .slice(0, 8)
    .map((r) => {
      const target: Target = { k: r[4] === 0 ? "w" : "c", v: r[2], l: r[3] };
      return `<a href="${targetHref(target)}" data-kk="${target.k}:${target.v}:${target.l}" class="kk">${r[2]}:${r[3]}</a>`;
    })
    .join(" ");
  return `<footer class="kk-card-seealso">另見 ${links}</footer>`;
}

function showShell(anchor: HTMLAnchorElement, t: Target, body: string): void {
  const el = ensureCard();
  const title = anchor.textContent?.trim() || "詞目";
  el.innerHTML = `<header class="kk-card-head"><a href="${targetHref(t)}">${pinned ? `前往【${title}】→` : title}</a></header><div class="kk-card-body">${body}</div>${homographs(t, title)}`;
  el.hidden = false;
  positionCard(anchor);
}

async function show(anchor: HTMLAnchorElement): Promise<void> {
  const t = parseTarget(anchor);
  if (!t) return;
  activeAnchor = anchor;
  showShell(anchor, t, `<p class="kk-card-loading">載入中…</p>`);
  try {
    const html = await entryHtml(t);
    if (activeAnchor !== anchor) return;
    showShell(anchor, t, html);
  } catch {
    if (activeAnchor === anchor) showShell(anchor, t, `<p class="kk-card-error">無法載入詞條。</p>`);
  }
}

function arm(anchor: HTMLAnchorElement): void {
  window.clearTimeout(dismissTimer);
  window.clearTimeout(intentTimer);
  const t = parseTarget(anchor);
  if (!t) return;
  void loadVolume(t.v);
  intentTimer = window.setTimeout(() => {
    void show(anchor);
  }, INTENT_MS);
}

function scheduleDismiss(): void {
  if (pinned) return;
  window.clearTimeout(intentTimer);
  window.clearTimeout(dismissTimer);
  dismissTimer = window.setTimeout(close, DISMISS_MS);
}

function close(): void {
  activeAnchor = null;
  pinned = false;
  if (card) card.hidden = true;
}

const finePointer = matchMedia("(pointer: fine)");

document.addEventListener("mouseover", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a.kk");
  if (a && finePointer.matches) arm(a);
});
document.addEventListener("focusin", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a.kk");
  if (a) arm(a);
});
document.addEventListener("mouseout", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a.kk");
  if (a && finePointer.matches) scheduleDismiss();
});
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a.kk");
  if (a && !finePointer.matches && !pinned) {
    e.preventDefault();
    pinned = true;
    void show(a);
    return;
  }
  if (card && !card.contains(e.target as Node) && (!a || a !== activeAnchor)) close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
});
window.addEventListener("pagehide", close);
window.addEventListener("resize", () => {
  if (activeAnchor && card && !card.hidden) positionCard(activeAnchor);
});