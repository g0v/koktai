export interface LinkTarget {
  k: "w" | "c";
  v: string;
  l: number;
}

export interface LinkSegment {
  text: string;
  target?: LinkTarget;
}

export interface RenderCtx {
  resolver: LinkResolver;
  hrefBase: string;
  /** Section-split URLs; required for cross-volume entry links. */
  corpus: import("./corpus.ts").Corpus;
  self?: { k?: "w" | "c"; v: string; l: number };
}

export interface LinkResolver {
  segment(text: string): LinkSegment[];
  char(han: string): LinkTarget | undefined;
  alternate(target: LinkTarget): LinkTarget | undefined;
}

interface TrieNode {
  target?: LinkTarget;
  next: Map<string, TrieNode>;
}

interface ResolverCorpus {
  volumes: Map<
    string,
    {
      words: Array<{ headword: string; volume: string; line: number }>;
      sinograms: Array<{ han: string; volume: string; line: number }>;
    }
  >;
}

const HEADWORD_TAG_RE = /<\/?k>/g;
const HAN_OR_PUA_RE = /[\p{Script=Han}\uE000-\uF8FF]/u;

export function normalizeHeadwordKey(headword: string): string {
  return headword.replace(HEADWORD_TAG_RE, "").replace(/·$/u, "");
}

function compareTarget(a: LinkTarget, b: LinkTarget): number {
  if (a.v !== b.v) return a.v.localeCompare(b.v);
  return a.l - b.l;
}

function insert(root: TrieNode, key: string, target: LinkTarget): void {
  let node = root;
  for (const ch of [...key]) {
    let next = node.next.get(ch);
    if (!next) {
      next = { next: new Map() };
      node.next.set(ch, next);
    }
    node = next;
  }
  if (!node.target || compareTarget(target, node.target) < 0) node.target = target;
}

export function buildResolver(corpus: ResolverCorpus): LinkResolver {
  const root: TrieNode = { next: new Map() };
  const charMap = new Map<string, LinkTarget>();
  const alternates = new Map<string, LinkTarget[]>();
  const sortedVolumes = [...corpus.volumes.keys()].sort();

  for (const v of sortedVolumes) {
    const volume = corpus.volumes.get(v)!;
    for (const w of volume.words) {
      const key = normalizeHeadwordKey(w.headword);
      if ([...key].length < 2 || w.headword.includes("<")) continue;
      const target: LinkTarget = { k: "w", v: w.volume, l: w.line };
      insert(root, key, target);
      const list = alternates.get(`w:${key}`) ?? [];
      list.push(target);
      alternates.set(`w:${key}`, list);
    }
    for (const s of volume.sinograms) {
      if (s.han === "") continue;
      const target: LinkTarget = { k: "c", v: s.volume, l: s.line };
      if (!charMap.has(s.han)) charMap.set(s.han, target);
      const list = alternates.get(`c:${s.han}`) ?? [];
      list.push(target);
      alternates.set(`c:${s.han}`, list);
    }
  }

  for (const list of alternates.values()) list.sort(compareTarget);

  function findLongest(
    chars: string[],
    start: number,
  ): { len: number; target: LinkTarget } | undefined {
    let node = root;
    let best: { len: number; target: LinkTarget } | undefined;
    for (let i = start; i < chars.length; i++) {
      const next = node.next.get(chars[i]!);
      if (!next) break;
      node = next;
      if (node.target) best = { len: i - start + 1, target: node.target };
    }
    return best;
  }

  return {
    segment(text: string): LinkSegment[] {
      const chars = [...text];
      const out: LinkSegment[] = [];
      let plain = "";
      const flush = () => {
        if (plain) out.push({ text: plain });
        plain = "";
      };
      for (let i = 0; i < chars.length; ) {
        const word = findLongest(chars, i);
        if (word) {
          flush();
          out.push({ text: chars.slice(i, i + word.len).join(""), target: word.target });
          i += word.len;
          continue;
        }
        const ch = chars[i]!;
        const charTarget = HAN_OR_PUA_RE.test(ch) ? charMap.get(ch) : undefined;
        if (charTarget) {
          flush();
          out.push({ text: ch, target: charTarget });
        } else {
          plain += ch;
        }
        i += 1;
      }
      flush();
      return out;
    },
    char(han: string): LinkTarget | undefined {
      return han ? charMap.get(han) : undefined;
    },
    alternate(target: LinkTarget): LinkTarget | undefined {
      for (const list of alternates.values()) {
        const hit = list.find((t) => t.k === target.k && t.v === target.v && t.l === target.l);
        if (!hit) continue;
        return list.find((t) => t.k !== target.k || t.v !== target.v || t.l !== target.l);
      }
      return undefined;
    },
  };
}