/// <reference path="./koktai-global.d.ts" />
import { entryHref } from "./search-matching.ts";
import { fetchFromSiteRoot } from "./runtime-base.ts";

type Kind = "w" | "c";
type Target = { k: Kind; v: string; l: number };

const INTENT_MS = 120;
const DISMISS_MS = 200;
const MAX_DOCS = 8;
const MARGIN = 8;
const FLIP_THRESHOLD = 320;

type EntryIndex = { volumes: Record<string, Record<string, number>> };
let entryIndex: EntryIndex | null = null;
let entryIndexPromise: Promise<EntryIndex> | null = null;

function pagePrefix(): string {
  const fromSearch = document.querySelector<HTMLElement>("[data-koktai-search]")?.dataset.base;
  return fromSearch ?? "./";
}

async function loadEntryIndex(): Promise<EntryIndex> {
  if (entryIndex) return entryIndex;
  if (!entryIndexPromise) {
    entryIndexPromise = fetchFromSiteRoot(pagePrefix(), "sections/entry-index.json")
      .then((r) => {
        if (!r.ok) throw new Error("entry-index fetch failed");
        return r.json() as Promise<EntryIndex>;
      })
      .then((data) => {
        entryIndex = data;
        return data;
      });
  }
  return entryIndexPromise;
}

const docCache = new Map<string, Document>();
const htmlCache = new Map<string, string>();
let activeAnchor: HTMLAnchorElement | null = null;
let card: HTMLElement | null = null;
let intentTimer = 0;
let dismissTimer = 0;
let pinned = false;

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

async function sectionFor(t: Target): Promise<number> {
  const idx = await loadEntryIndex();
  const sec = idx.volumes[t.v]?.[anchorId(t)];
  if (!sec) throw new Error(`no section for ${anchorId(t)} in vol ${t.v}`);
  return sec;
}

async function targetHref(t: Target): Promise<string> {
  const sec = await sectionFor(t);
  return entryHref(pagePrefix(), t.v, t.k === "c" ? 1 : 0, t.l, sec);
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

async function loadSectionPage(v: string, sec: number): Promise<Document> {
  const key = `${v}/${sec}`;
  const cached = docCache.get(key);
  if (cached) return cached;
  const res = await fetchFromSiteRoot(pagePrefix(), `${v}/${sec}/index.html`);
  if (!res.ok) throw new Error(`section ${v}/${sec} fetch failed: ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  docCache.set(key, doc);
  while (docCache.size > MAX_DOCS) docCache.delete(docCache.keys().next().value!);
  return doc;
}

async function entryHtml(t: Target): Promise<string> {
  const key = targetKey(t);
  const cached = htmlCache.get(key);
  if (cached) return cached;
  const sec = await sectionFor(t);
  const doc = await loadSectionPage(t.v, sec);
  const node = doc.getElementById(anchorId(t));
  if (!node) throw new Error(`missing ${anchorId(t)} in ${t.v}/${sec}/index.html`);
  const clone = node.cloneNode(true) as Element;
  stripIds(clone);
  const html = clone.outerHTML;
  htmlCache.set(key, html);
  return html;
}

function showShell(anchor: HTMLAnchorElement, t: Target, body: string, href: string): void {
  const el = ensureCard();
  const title = anchor.textContent?.trim() || "詞目";
  el.innerHTML = `<header class="kk-card-head"><a href="${href}">${pinned ? `前往【${title}】→` : title}</a></header><div class="kk-card-body">${body}</div>`;
  el.hidden = false;
  positionCard(anchor);
}

async function show(anchor: HTMLAnchorElement): Promise<void> {
  const t = parseTarget(anchor);
  if (!t) return;
  activeAnchor = anchor;
  const href = await targetHref(t);
  showShell(anchor, t, `<p class="kk-card-loading">載入中…</p>`, href);
  try {
    const html = await entryHtml(t);
    if (activeAnchor !== anchor) return;
    showShell(anchor, t, html, href);
  } catch {
    if (activeAnchor === anchor) {
      showShell(anchor, t, `<p class="kk-card-error">無法載入詞條。</p>`, href);
    }
  }
}

function arm(anchor: HTMLAnchorElement): void {
  window.clearTimeout(dismissTimer);
  window.clearTimeout(intentTimer);
  const t = parseTarget(anchor);
  if (!t) return;
  void loadEntryIndex().then((idx) => {
    const sec = idx.volumes[t.v]?.[anchorId(t)];
    if (sec) void loadSectionPage(t.v, sec);
  });
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