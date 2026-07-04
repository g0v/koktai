// lib/extract/labels.ts
import type { Usage } from "./types.ts";

const ATOMS: Record<string, Usage["dim"]> = {
  文: "register", 語: "register", 白: "register", 俗: "register",
  字音: "register", 語音: "register", 文音: "register", 白音: "register",
  又音: "register", 口語: "register",
  漳: "geo", 泉: "geo", 廈: "geo", 廈門: "geo", 台: "geo", 同安: "geo", 北方: "geo",
  國音: "source", 台甘: "source", 甘典: "source", 普閩: "source", 普閩典: "source",
  台日典: "source", 台日: "source", 匯: "source", 新華典: "source", 陸彙: "source",
  康典: "source", 台類語: "source",
  訓讀: "phenomenon", 訛變: "phenomenon", 音字脫節: "phenomenon", 俗字: "phenomenon", 借音: "phenomenon",
  常: "frequency", 常用: "frequency", 常語: "frequency", 常言: "frequency",
  罕用: "frequency", 舊語: "frequency", 新語: "frequency", 俗語: "frequency",
  褒義: "attitude", 貶義: "attitude",
  直譯: "translation", 意譯: "translation",
  "？": "certainty",
};

function atom(text: string): Usage | null {
  const dim = ATOMS[text];
  return dim ? { dim, value: text } : null;
}

/**
 * Classify a parenthesized label. Returns null when the text is prose.
 * Handles separators 、 ／ / and separator-free compounds of known atoms
 * (廈泉 → 廈+泉, 文白 → 文+白), longest-atom-first.
 */
export function classifyLabel(text: string): Usage[] | null {
  const t = text.trim();
  if (t.length === 0 || t.length > 8) return null;
  const parts = t.split(/[、／/]/).map((p) => p.trim()).filter(Boolean);
  const out: Usage[] = [];
  for (const part of parts) {
    const whole = atom(part);
    if (whole) { out.push(whole); continue; }
    // separator-free compound: greedy longest-match decomposition
    let i = 0;
    const local: Usage[] = [];
    while (i < part.length) {
      let matched: Usage | null = null;
      for (let len = Math.min(4, part.length - i); len >= 1; len--) {
        matched = atom(part.slice(i, i + len));
        if (matched) { i += len; break; }
      }
      if (!matched) return null;
      local.push(matched);
    }
    out.push(...local);
  }
  return out.length > 0 ? out : null;
}