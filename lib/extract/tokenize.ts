import { classifyLabel } from "./labels.ts";
import { classifyPua, isPua, puaHex } from "./syllables.ts";
import type {
  BareReading,
  HanSyllable,
  Reading,
  Syllables,
  Token,
  Usage,
  VariantGroup,
} from "./types.ts";

const BOPO = /^[\u3105-\u312f\u31a0-\u31bf\u02d9\u02ca\u02c7\u02cb\u02ea\u02eb\u0307\s]+$/u;
const HAN = /\p{Script=Han}/u;

function zyFromPua(ch: string, s: Syllables): string | null {
  const cl = classifyPua(ch, s);
  if (cl.type === "reading" || cl.type === "kReading") return cl.zhuyin;
  return null;
}

function kZy(pua: string, s: Syllables): string | null {
  const v = s.k[puaHex(pua)];
  return v !== undefined && BOPO.test(v) ? v : null;
}

export function serializeTokens(input: string, tokens: Token[]): string {
  let pos = 0;
  for (const t of tokens) {
    if (t.span[0] !== pos) throw new Error(`serializeTokens gap at ${pos}`);
    pos = t.span[1];
  }
  if (pos !== input.length) throw new Error(`serializeTokens incomplete`);
  return tokens.map((t) => input.slice(t.span[0], t.span[1])).join("");
}

interface ParsedSyllableChunk {
  han: string;
  readings: Reading[];
}

/** Collect slash-separated reading PUAs at end of segment; prose parens on rest; last han is base. */
function parseSyllableChunk(chunk: string, s: Syllables): ParsedSyllableChunk | null {
  const chars = [...chunk];
  const rds: string[] = [];
  let end = chars.length;
  while (end > 0 && isPua(chars[end - 1]!) && zyFromPua(chars[end - 1]!, s)) {
    rds.unshift(chars[--end]!);
  }
  if (!rds.length) return null;
  let rest = chars.slice(0, end).join("");
  while (rest.endsWith("/")) rest = rest.slice(0, -1);
  const readings = rds.map((ch) => ({ zhuyin: zyFromPua(ch, s)!, usages: [] as Usage[] }));
  const hans: string[] = [];
  while (rest.endsWith(")")) {
    const o = rest.lastIndexOf("(");
    if (o < 0) return null;
    const inner = rest.slice(o + 1, -1).replace(/^\/+|\/+$/g, "").trim();
    let hasR = false;
    for (const c of inner) if (isPua(c) && zyFromPua(c, s)) hasR = true;
    if (inner && !hasR) hans.push(inner);
    rest = rest.slice(0, o);
  }
  if (rest) {
    let h = rest;
    if (h.startsWith("<k>") && h.endsWith("</k>")) h = h.slice(3, -4);
    hans.push(h);
  }
  if (!hans.length) return null;
  const han = hans[hans.length - 1]!;
  if (han !== "～" && [...han].length > 1) return null;
  return { han, readings };
}

function reconcile(input: string, raw: Token[]): Token[] {
  const sorted = [...raw].sort((a, b) => a.span[0] - b.span[0]);
  const out: Token[] = [];
  let c = 0;
  for (const t of sorted) {
    if (t.span[1] <= c) continue;
    let a = Math.max(t.span[0], c);
    const b = t.span[1];
    if (a > c) out.push({ kind: "prose", text: input.slice(c, a), span: [c, a] });
    out.push({ ...t, span: [a, b] });
    c = b;
  }
  if (c < input.length) out.push({ kind: "prose", text: input.slice(c), span: [c, input.length] });
  let p = 0;
  for (const t of out) {
    if (t.span[0] !== p) throw new Error(`tokenize gap ${p} vs ${t.span[0]}`);
    p = t.span[1];
  }
  if (p !== input.length) throw new Error("tokenize incomplete");
  return out;
}

class Scanner {
  readonly input: string;
  readonly cps: string[];
  i = 0;
  pos = 0;
  constructor(
    readonly s: Syllables,
    input: string,
  ) {
    this.input = input;
    this.cps = [...input];
  }
  done() {
    return this.i >= this.cps.length;
  }
  peek() {
    return this.cps[this.i];
  }
  take() {
    const ch = this.cps[this.i]!;
    const a = this.pos;
    this.i++;
    this.pos += ch.length;
    return this.input.slice(a, this.pos);
  }
  off(i: number) {
    let o = 0;
    for (let k = 0; k < i; k++) o += this.cps[k]!.length;
    return o;
  }
  rewind(off: number) {
    let acc = 0;
    for (let k = 0; k < this.cps.length; k++) {
      if (acc === off) {
        this.i = k;
        this.pos = off;
        return;
      }
      acc += this.cps[k]!.length;
    }
    this.i = this.cps.length;
    this.pos = off;
  }
  readParen() {
    if (this.peek() !== "(") return null;
    const start = this.pos;
    this.take();
    const is = this.pos;
    let d = 1;
    while (!this.done() && d > 0) {
      const ch = this.peek()!;
      if (ch === "(") d++;
      else if (ch === ")") d--;
      if (d > 0) this.take();
    }
    if (d) {
      this.rewind(start);
      return null;
    }
    const ie = this.pos;
    this.take();
    return { inner: this.input.slice(is, ie), start, end: this.pos };
  }
  suffixLabels(syl: HanSyllable): HanSyllable {
    const readings = syl.readings.map((r) => ({ ...r, usages: [...r.usages] }));
    let prefix: Usage[] = [];

    for (;;) {
      const pg = this.readParen();
      if (!pg) break;

      const zipParts = pg.inner.split(/[／/]/).map((p) => p.trim()).filter(Boolean);
      if (zipParts.length === readings.length && zipParts.length > 1) {
        const rows: Usage[][] = [];
        let zipOk = true;
        for (const p of zipParts) {
          const l = classifyLabel(p);
          if (!l) {
            zipOk = false;
            break;
          }
          rows.push(l);
        }
        if (zipOk) {
          for (let i = 0; i < readings.length; i++) {
            readings[i] = {
              zhuyin: readings[i]!.zhuyin,
              usages: [...prefix, ...readings[i]!.usages, ...rows[i]!],
            };
          }
          prefix = [];
          if (this.peek() === "/" && isPua(this.cps[this.i + 1] ?? "") && zyFromPua(this.cps[this.i + 1]!, this.s)) {
            this.take();
            const zy = zyFromPua(this.take(), this.s)!;
            readings.push({ zhuyin: zy, usages: [] });
            continue;
          }
          break;
        }
      }

      const labs = classifyLabel(pg.inner);
      if (!labs) {
        this.rewind(pg.start);
        break;
      }
      if (!readings.length) {
        prefix.push(...labs);
        continue;
      }
      const last = readings.length - 1;
      readings[last] = {
        zhuyin: readings[last]!.zhuyin,
        usages: [...prefix, ...readings[last]!.usages, ...labs],
      };
      prefix = [];
      if (this.peek() === "/" && isPua(this.cps[this.i + 1] ?? "") && zyFromPua(this.cps[this.i + 1]!, this.s)) {
        this.take();
        const zy = zyFromPua(this.take(), this.s)!;
        readings.push({ zhuyin: zy, usages: [] });
        continue;
      }
      break;
    }
    return { ...syl, readings, span: [syl.span[0], this.pos] };
  }
  positionalZip(syl: HanSyllable): HanSyllable {
    const pg = this.readParen();
    if (!pg) return syl;
    const parts = pg.inner.split(/[／/]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length !== syl.readings.length) {
      this.rewind(pg.start);
      return syl;
    }
    const rows: Usage[][] = [];
    for (const p of parts) {
      const l = classifyLabel(p);
      if (!l) {
        this.rewind(pg.start);
        return syl;
      }
      rows.push(l);
    }
    const readings = syl.readings.map((r, idx) => ({
      zhuyin: r.zhuyin,
      usages: [...r.usages, ...rows[idx]!],
    }));
    return { ...syl, readings, span: [syl.span[0], this.pos] };
  }
  parseQuote(): { tokens: Token[]; span: [number, number] } | null {
    if (this.peek() !== "「") return null;
    const qs = this.pos;
    this.take();
    const is = this.pos;
    while (!this.done() && this.peek() !== "」") this.take();
    const inner = this.input.slice(is, this.pos);
    if (this.peek() === "」") this.take();
    const qe = this.pos;
    const innerTok = tokenizeTaigi(inner, this.s);
    if (!innerTok.length) {
      return { tokens: [{ kind: "prose", text: this.input.slice(qs, qe), span: [qs, qe] }], span: [qs, qe] };
    }
    const shifted = innerTok.map((t) => ({
      ...t,
      span: [qs + 1 + t.span[0], qs + 1 + t.span[1]] as [number, number],
    }));
    shifted[0]!.span[0] = qs;
    shifted[shifted.length - 1]!.span[1] = qe;
    return { tokens: shifted, span: [qs, qe] };
  }
  run(): Token[] {
    const out: Token[] = [];
    let proseAt: number | null = null;
    const flush = () => {
      if (proseAt === null) return;
      out.push({ kind: "prose", text: this.input.slice(proseAt, this.pos), span: [proseAt, this.pos] });
      proseAt = null;
    };
    while (!this.done()) {
      if (this.peek() === "「") {
        flush();
        const q = this.parseQuote();
        if (!q) continue;
        const slash = this.input[q.span[0] - 1] === "/" && out.at(-1)?.kind === "syl";
        const bareOnly = q.tokens.length > 0 && q.tokens.every((t) => t.kind === "reading");
        if (slash && bareOnly) {
          const slashAt = q.span[0] - 1;
          const bare = q.tokens as BareReading[];
          const syls: HanSyllable[] = [];
          for (let o = out.length - 1; o >= 0 && syls.length < bare.length; o--) {
            const t = out[o]!;
            if (t.kind === "syl") syls.unshift(t);
          }
          for (let i = 0; i < bare.length && i < syls.length; i++) {
            syls[i]!.readings.push(...bare[i]!.readings);
            if (i === syls.length - 1) syls[i]!.span[1] = q.span[1];
          }
          const pg = this.readParen();
          if (pg) {
            const labs = classifyLabel(pg.inner);
            if (labs) for (const t of out) if (t.kind === "syl" && t.span[0] >= slashAt)
              for (const r of t.readings) r.usages.push(...labs);
            else this.rewind(pg.start);
          }
          continue;
        }
        for (const t of q.tokens) out.push(t);
        const inQuote = (t: Token) => t.span[0] >= q.span[0] && t.span[1] <= q.span[1];
        const quoteSyls = () => out.filter((t): t is HanSyllable => t.kind === "syl" && inQuote(t));
        const applyQuoteSyl = (hs: HanSyllable) => {
          const idx = out.indexOf(hs);
          const next = this.positionalZip(this.suffixLabels(hs));
          if (idx >= 0) out[idx] = next;
          return next;
        };
        let lastQ = quoteSyls().at(-1);
        if (lastQ) lastQ = applyQuoteSyl(lastQ);
        if (this.peek() === "/") {
          this.take();
          const br = this.bareOrK();
          lastQ = quoteSyls().at(-1);
          if (br?.kind === "reading" && lastQ) {
            lastQ.readings.push(...br.readings);
            const pg2 = this.readParen();
            if (pg2) {
              const labs = classifyLabel(pg2.inner);
              if (labs && lastQ.readings.length) {
                lastQ.readings.at(-1)!.usages.push(...labs);
                lastQ.span[1] = pg2.end;
              } else {
                this.rewind(pg2.start);
                lastQ.span[1] = br.span[1];
              }
            } else lastQ.span[1] = br.span[1];
          } else if (br) out.push(br);
        }
        continue;
      }
      if (this.input.slice(this.pos).startsWith("(/")) {
        flush();
        const v = this.variant();
        if (v) {
          out.push(v);
          continue;
        }
      }
      if (this.input.slice(this.pos).startsWith("<k>")) {
        flush();
        const kt = this.bareOrK();
        if (!kt) {
          const close = this.input.indexOf("</k>", this.pos);
          if (close >= 0) {
            const end = close + 4;
            while (this.pos < end) this.take();
          } else {
            this.take();
          }
          continue;
        }
        const prev = out.at(-1);
        if (prev?.kind === "syl" && kt.kind === "reading") {
          prev.readings.push(...kt.readings);
          prev.span[1] = kt.span[1];
        } else if (prev?.kind === "syl" && kt.kind === "syl") {
          const zy = kZy((kt as HanSyllable).han.slice(3, -4), this.s);
          if (zy) {
            prev.readings.push({ zhuyin: zy, usages: [] });
            prev.span[1] = kt.span[1];
          } else out.push(kt);
        } else out.push(kt);
        continue;
      }
      if ((HAN.test(this.peek()!) || this.peek() === "～") && !isPua(this.peek()!)) {
        flush();
        const a = this.pos;
        const han = this.take();
        const readings: Reading[] = [];
        while (!this.done() && isPua(this.peek()!) && zyFromPua(this.peek()!, this.s)) {
          readings.push({ zhuyin: zyFromPua(this.take(), this.s)!, usages: [] });
        }
        while (this.peek() === "/") {
          this.take();
          if (this.peek() === "「") break;
          const zy = zyFromPua(this.take(), this.s);
          if (!zy) break;
          readings.push({ zhuyin: zy, usages: [] });
        }
        let hs: HanSyllable = { kind: "syl", han, readings, span: [a, this.pos] };
        hs = this.positionalZip(this.suffixLabels(hs));
        out.push(hs);
        continue;
      }
      if (isPua(this.peek()!) && zyFromPua(this.peek()!, this.s)) {
        flush();
        const prev = out.at(-1);
        if (prev?.kind === "syl" && prev.span[1] === this.pos) {
          while (!this.done() && isPua(this.peek()!) && zyFromPua(this.peek()!, this.s)) {
            prev.readings.push({ zhuyin: zyFromPua(this.take(), this.s)!, usages: [] });
          }
          prev.span[1] = this.pos;
          out[out.length - 1] = this.positionalZip(this.suffixLabels(prev));
          continue;
        }
        let endI = this.i;
        while (endI < this.cps.length && isPua(this.cps[endI]!) && zyFromPua(this.cps[endI]!, this.s)) endI++;
        let parsed: ParsedSyllableChunk | null = null;
        let st = 0;
        const lookbackStart = Math.max(0, this.i - 24);
        for (let k = lookbackStart; k <= this.i; k++) {
          const p = parseSyllableChunk(this.cps.slice(k, endI).join(""), this.s);
          if (p) {
            parsed = p;
            st = k;
            break;
          }
        }
        if (parsed) {
          this.i = st;
          this.pos = this.off(st);
          while (this.i < endI) this.take();
          let hs: HanSyllable = {
            kind: "syl",
            han: parsed.han,
            readings: parsed.readings,
            span: [this.off(st), this.pos],
          };
          hs = this.positionalZip(this.suffixLabels(hs));
          out.push(hs);
          continue;
        }
        const a = this.pos;
        const ch = this.take();
        out.push({ kind: "reading", readings: [{ zhuyin: zyFromPua(ch, this.s)!, usages: [] }], span: [a, this.pos] });
        continue;
      }
      if (proseAt === null) proseAt = this.pos;
      this.take();
    }
    flush();
    return reconcile(this.input, out);
  }
  bareOrK(): Token | null {
    const a = this.pos;
    const slice = this.input.slice(a);
    const m = /^<k>([\u{F0000}-\u{FFFFF}])<\/k>/u.exec(slice);
    if (m) {
      const full = m[0];
      this.i += [...full].length;
      this.pos += full.length;
      const zy = kZy(m[1]!, this.s);
      if (zy) return { kind: "reading", readings: [{ zhuyin: zy, usages: [] }], span: [a, this.pos] };
      return { kind: "syl", han: full, readings: [], span: [a, this.pos] };
    }
    const mg = /^<k>(.*?)<\/k>/u.exec(slice);
    if (mg) {
      const full = mg[0];
      const inner = mg[1]!;
      this.i += [...full].length;
      this.pos += full.length;
      if ([...inner].length === 1) {
        const zy = kZy(inner, this.s);
        if (zy) return { kind: "reading", readings: [{ zhuyin: zy, usages: [] }], span: [a, this.pos] };
      }
      return { kind: "syl", han: full, readings: [], span: [a, this.pos] };
    }
    if (isPua(this.peek()!) && zyFromPua(this.peek()!, this.s)) {
      const ch = this.take();
      return { kind: "reading", readings: [{ zhuyin: zyFromPua(ch, this.s)!, usages: [] }], span: [a, this.pos] };
    }
    return null;
  }
  variant(): VariantGroup | null {
    if (!this.input.slice(this.pos).startsWith("(/")) return null;
    const a = this.pos;
    this.take();
    this.take();
    const alts: string[] = [];
    let buf = "";
    let d = 1;
    while (!this.done() && d > 0) {
      const ch = this.peek()!;
      if (ch === "(") d++;
      if (d === 1 && ch === "/") {
        alts.push(buf);
        buf = "";
        this.take();
        continue;
      }
      if (ch === ")") {
        d--;
        if (!d) {
          this.take();
          break;
        }
      }
      buf += this.take();
    }
    alts.push(buf);
    let lastAlt = alts[alts.length - 1] ?? "";
    let usages: Usage[] = [];
    const colonIdx = lastAlt.lastIndexOf("：");
    if (colonIdx >= 0) {
      const labelText = lastAlt.slice(colonIdx + 1);
      const labs = classifyLabel(labelText);
      if (labs) {
        usages = labs;
        lastAlt = lastAlt.slice(0, colonIdx);
        alts[alts.length - 1] = lastAlt;
      }
    }
    return { kind: "variant", alternatives: alts.map((alt) => tokenizeTaigi(alt, this.s)), usages, span: [a, this.pos] };
  }
}

export function tokenizeTaigi(normalized: string, s: Syllables): Token[] {
  if (!normalized.length) return [];
  return new Scanner(s, normalized).run();
}