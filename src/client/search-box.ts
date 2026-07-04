import type { FromWorker, FulltextHit, SuggestRow, ToWorker } from "./protocol.ts";
import {
  entryHref,
  formatVolumeLabel,
  highlightMatch,
  rankSuggestRows,
} from "./search-matching.ts";

declare global {
  interface Window {
    __koktaiSuggest?: SuggestRow[];
  }
}

type ListItem =
  | { kind: "suggest"; row: SuggestRow }
  | { kind: "fulltext"; hit: FulltextHit }
  | { kind: "status"; label: string }
  | { kind: "fulltext-action"; query: string };

function initSearchBox(root: HTMLElement): void {
  const base = root.dataset.base ?? "/";
  const input = root.querySelector<HTMLInputElement>(".search-input");
  const toggle = root.querySelector<HTMLButtonElement>(".search-toggle");
  const popup = root.querySelector<HTMLDivElement>(".search-popup");
  const list = root.querySelector<HTMLDivElement>(".search-list");
  const footer = root.querySelector<HTMLButtonElement>(".search-fulltext");
  if (!input || !popup || !list || !footer) return;

  let rows: SuggestRow[] = [];
  let items: ListItem[] = [];
  let active = -1;
  let mode: "suggest" | "fulltext" = "suggest";
  let fetchStarted = false;
  let worker: Worker | undefined;
  let pendingQuery = "";
  const setExpanded = (open: boolean) => {
    root.dataset.open = open ? "true" : "false";
    input.setAttribute("aria-expanded", open ? "true" : "false");
    toggle?.setAttribute("aria-expanded", open ? "true" : "false");
    popup.hidden = !open;
  };

  const optionId = (i: number) => `search-opt-${i}`;

  const render = () => {
    list.replaceChildren();
    items.forEach((item, i) => {
      const el = document.createElement("div");
      el.id = optionId(i);
      el.className = "search-option";
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", i === active ? "true" : "false");
      if (item.kind === "status") {
        el.classList.add("search-option-status");
        el.textContent = item.label;
      } else if (item.kind === "fulltext-action") {
        el.classList.add("search-option-action");
        el.textContent = `全文檢索 “${item.query}”`;
      } else if (item.kind === "suggest") {
        const [t, z, v, , k] = item.row;
        const q = input.value.trim();
        el.innerHTML = `<span class="search-term">${highlightMatch(t, q)}</span><span class="search-zhuyin">${highlightMatch(z, q)}</span><span class="search-vol">${formatVolumeLabel(v)}${k === 1 ? " 字" : ""}</span>`;
      } else {
        const { hit } = item;
        el.innerHTML = `<span class="search-term">${highlightMatch(hit.t, input.value.trim())}</span><span class="search-snippet">${hit.snippet}</span><span class="search-vol">${formatVolumeLabel(hit.v)}</span>`;
      }
      el.addEventListener("mousedown", (e) => e.preventDefault());
      el.addEventListener("click", () => {
        active = i;
        navigateActive();
      });
      list.append(el);
    });
    if (active >= 0 && active < items.length) {
      input.setAttribute("aria-activedescendant", optionId(active));
    } else {
      input.removeAttribute("aria-activedescendant");
    }
    const q = input.value.trim();
    footer.hidden = !q || mode !== "suggest";
    footer.textContent = q ? `全文檢索 “${q}”` : "";
  };

  const loadSuggest = async () => {
    if (fetchStarted) return;
    fetchStarted = true;
    const url = `${base.endsWith("/") ? base : `${base}/`}search-data/suggest.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      rows = (await res.json()) as SuggestRow[];
      window.__koktaiSuggest = rows;
      updateSuggest();
    } catch {
      /* ignore */
    }
  };

  const updateSuggest = () => {
    if (mode !== "suggest") return;
    const q = input.value.trim();
    const ranked = rankSuggestRows(rows, q);
    items = ranked.map((row) => ({ kind: "suggest", row }));
    if (q) items.push({ kind: "fulltext-action", query: q });
    active = items.length > 0 ? 0 : -1;
    render();
  };

  const ensureWorker = () => {
    if (worker) return worker;
    worker = new Worker(new URL("./search-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (event: MessageEvent<FromWorker>) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "status") {
        if (mode !== "fulltext") return;
        const label =
          msg.phase === "fetching"
            ? "載入全文資料…"
            : msg.phase === "indexing"
              ? "建立全文索引…"
              : "全文索引就緒";
        items = [{ kind: "status", label }];
        active = 0;
        render();
        return;
      }
      if (msg.type === "results" && msg.q === pendingQuery) {
        items = msg.items.map((hit) => ({ kind: "fulltext", hit }));
        active = items.length > 0 ? 0 : -1;
        render();
      }
    });
    return worker;
  };

  const runFulltext = (q: string) => {
    const query = q.trim();
    if (query.length < 2) return;
    mode = "fulltext";
    pendingQuery = query;
    items = [{ kind: "status", label: "建立全文索引…" }];
    active = 0;
    setExpanded(true);
    render();
    const w = ensureWorker();
    const payload: ToWorker = { type: "query", q: query, limit: 40, base };
    w.postMessage(payload);
  };

  const navigateActive = () => {
    const item = items[active];
    if (!item) return;
    if (item.kind === "fulltext-action") {
      runFulltext(item.query);
      return;
    }
    if (item.kind === "status") return;
    const vol = item.kind === "suggest" ? item.row[2] : item.hit.v;
    const line = item.kind === "suggest" ? item.row[3] : item.hit.l;
    const k = item.kind === "suggest" ? item.row[4] : item.hit.k;
    location.assign(entryHref(base, vol, k, line));
  };

  input.addEventListener("focus", () => {
    void loadSuggest();
    if (input.value.trim()) setExpanded(true);
  });
  input.addEventListener("input", () => {
    mode = "suggest";
    setExpanded(!!input.value.trim());
    updateSuggest();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setExpanded(false);
      input.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!popup.hidden && items.length) {
        active = Math.min(active + 1, items.length - 1);
        render();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!popup.hidden && items.length) {
        active = Math.max(active - 1, 0);
        render();
      }
      return;
    }
    if (e.key === "Enter") {
      if (e.shiftKey && input.value.trim()) {
        e.preventDefault();
        runFulltext(input.value);
        return;
      }
      if (!popup.hidden && active >= 0) {
        e.preventDefault();
        navigateActive();
      }
    }
  });

  footer.addEventListener("click", () => runFulltext(input.value));

  toggle?.addEventListener("click", () => {
    const open = root.dataset.open !== "true";
    root.dataset.open = open ? "true" : "false";
    if (open) {
      input.focus();
      void loadSuggest();
    } else {
      setExpanded(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (
      t instanceof HTMLElement &&
      (t.isContentEditable ||
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT")
    ) {
      return;
    }
    e.preventDefault();
    input.focus();
    void loadSuggest();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "k" || (!e.metaKey && !e.ctrlKey)) return;
    e.preventDefault();
    input.focus();
    void loadSuggest();
  });

  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => void loadSuggest());
  } else {
    setTimeout(() => void loadSuggest(), 1200);
  }
}

for (const el of document.querySelectorAll<HTMLElement>("[data-koktai-search]")) {
  initSearchBox(el);
}