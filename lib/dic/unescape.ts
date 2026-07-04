import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface FontMaps {
  k: Record<string, string>;
  m3: Record<string, string>;
  m3Noruby: Record<string, string>;
  mapping: Record<string, string>;
}

export function loadFontMaps(root: string): FontMaps {
  const font = join(root, "font");
  const parse = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Record<string, string>;
  return {
    k: parse(join(font, "k.json")),
    m3: parse(join(font, "m3.json")),
    m3Noruby: parse(join(font, "m3_noruby.json")),
    mapping: parse(join(root, "a-tsioh_sandbox/mapping.json")),
  };
}

const UNPRON_K =
  /[\u{ffa72}-\u{ffa74}\u{ffaa1}-\u{ffaad}]/u;

function orientRt(rt: string, useHruby: boolean): string {
  if (useHruby) return rt;
  return rt.replaceAll("ㄧ", "丨").replaceAll("ㆪ", "ㆳ");
}

function astralCode(ch: string): string {
  const cp = ch.codePointAt(0)!;
  return (cp - 0xf0000).toString(16).padStart(4, "0");
}

/** Astral PUA readings: `jade-unescape.pl` `m3()` uses `m3.json` only (not `k.json`). */
function astralRtText(
  code: string,
  maps: FontMaps,
  inner: (s: string) => string,
  useHruby: boolean,
): string | null {
  const rt = maps.m3[code];
  if (!rt) return null;
  return orientRt(inner(rt), useHruby);
}

function expandK(str: string, maps: FontMaps, useHruby: boolean): string {
  str = str.replace(/[\u{fc6a1}-\u{fc6a9}]/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    return String.fromCodePoint(0x245f + (cp - 0xfc6a0));
  });
  const hi = /[\u{f8000}-\u{fafff}\u{ff000}-\u{fffff}]/gu;
  str = str.replace(hi, (ch) => {
    const mapped = maps.mapping[ch];
    if (mapped) return mapped;
    const code = astralCode(ch);
    const rt = maps.k[code];
    return rt ? `<rt>${orientRt(rt, useHruby)}</rt>` : `<mark>&#xf${code};</mark>`;
  });
  const lo = /[\u{f0000}-\u{f7fff}\u{fb000}-\u{fefff}]/gu;
  str = str.replace(lo, (ch) => {
    const mapped = maps.mapping[ch];
    if (mapped) return mapped;
    const code = astralCode(ch);
    const rt = maps.k[code];
    return rt ? `<rt>${orientRt(rt, useHruby)}</rt>` : `<img src="img/k/${code}.png">`;
  });
  return str;
}

function expandM3(str: string, maps: FontMaps, useHruby: boolean, noInner = false): string {
  const inner = noInner
    ? (s: string) => s
    : (s: string) => expandM3(s, maps, useHruby, true);
  str = str.replace(/[\u{fc6a1}-\u{fc6a9}](?!<\/mark>)/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    return String.fromCodePoint(0x245f + (cp - 0xfc6a0));
  });
  str = str.replace(/[\u{f0000}-\u{fffff}](?!<\/mark>)/gu, (ch) => {
    const code = astralCode(ch);
    const noruby = maps.m3Noruby[code];
    if (noruby) {
      return noruby.includes("〾") ? `<img src="img/m3/${code}.png">` : noruby;
    }
    const rtText = astralRtText(code, maps, inner, useHruby);
    return rtText ? `<rt>${rtText}</rt>` : `<img src="img/m3/${code}.png">`;
  });
  return str;
}

function expandKTags(line: string, maps: FontMaps, useHruby: boolean): string {
  return line.replace(/<k>(.*?)<\/k>/gs, (_, inner: string) =>
    expandK(inner, maps, useHruby),
  );
}

function astralToMarkup(ch: string, maps: FontMaps, useHruby: boolean): string {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0xfc6a1 && cp <= 0xfc6a9) {
    return String.fromCodePoint(0x245f + (cp - 0xfc6a0));
  }
  const code = astralCode(ch);
  const noruby = maps.m3Noruby[code];
  if (noruby) {
    return noruby.includes("〾") ? `<img src="img/m3/${code}.png">` : noruby;
  }
  const inner = (x: string) => expandM3(x, maps, useHruby, true);
  const rtText = astralRtText(code, maps, inner, useHruby);
  if (rtText) return `<rt>${rtText}</rt>`;
  return `<img src="img/m3/${code}.png">`;
}

/** Port of `font/jade-unescape.pl` (default ruby-position, no --hruby). */
export function jadeUnescapeLine(line: string, maps: FontMaps, useHruby = false): string {
  let s = line;
  s = expandKTags(s, maps, useHruby);
  s = s.replace(
    /([\u{f0000}-\u{fffff}])(?!<\/mark>)/gu,
    (ch) => astralToMarkup(ch, maps, useHruby),
  );
  s = s.replace(/[˙·]<rt>/g, "<rt>˙");

  const rubyTag = useHruby ? 'ruby class="zhuyin"' : "ruby";
  if (!useHruby) {
    s = s.replace(/(<\/rt>(?:[/→]<rt>.*?<\/rt>)+)(?!<rt>)/g, (m) => {
      const rts = m.replace(/<\/?rt>/g, "");
      return `${rts}</rt>`;
    });
  }

  const kcharQ =
    "(?:<mark>&#xf[0-9a-f]*;</mark>|<img src=\"img/k/[0-9a-f]+.png\">)";
  // Wrap like Perl's qr// so a trailing `?` quantifies the whole alternative.
  const altQ = `(?:(?:.|${kcharQ})(?:[:：](?:.|${kcharQ})*?)?)`;
  const altsQ = `\\*|\\*?(?:[(（]${altQ}?(?:[/／]${altQ})+[)）])+`;

  const kRuby = new RegExp(
    `(${kcharQ})(${altsQ})?<rt>(.*?)</rt>(?!</ruby>)`,
    "gu",
  );
  s = s.replace(kRuby, (_full, rb: string, alts: string | undefined, rt: string) => {
    const hexM = rb.match(/xf([0-9a-f]+)/i) ?? rb.match(/img\/k\/([0-9a-f]+)/i);
    const hex = hexM?.[1] ?? "0";
    const char = String.fromCodePoint(0xf0000 + parseInt(hex, 16));
    if (UNPRON_K.test(char)) return `${rb}${alts ?? ""}<rt>${rt}</rt>`;
    if (useHruby && alts) return `${rb}${alts}<${rubyTag}><rt>${rt}</rt></ruby>`;
    return `<${rubyTag}>${rb}<rt>${rt}</rt></ruby>${alts ?? ""}`;
  });

  const m3Ruby = new RegExp(
    `(～|\\(\\s+\\)|[^\\p{P}\\p{S}\\p{M}\\p{Z}])(${altsQ})?<rt>([^<>]*?)</rt>(?!</ruby>)`,
    "gu",
  );
  s = s.replace(m3Ruby, (_full, rb: string, alts: string | undefined, rt: string) => {
    if (useHruby && alts) return `${rb}${alts}<${rubyTag}><rt>${rt}</rt></ruby>`;
    return `<${rubyTag}>${rb}<rt>${rt}</rt></ruby>${alts ?? ""}`;
  });

  if (useHruby) {
    s = s.replace(/(<rt>[^<>]*?<\/rt>)(?!<\/ruby>)/g, `<${rubyTag}>$1</ruby>`);
  }
  if (!useHruby) {
    const rubyChain = new RegExp(
          "(?:(?:<ruby>(?:.|(?:<mark>.*?<\\/mark>)|(?:<img .*?>))<rt>.*?<\\/rt>)*<\\/ruby>)+",
          "gsu",
        );
    s = s.replace(rubyChain, (block) => {
      let rts = block.replace(/<ruby><\/ruby>/g, "");
      rts = rts.replace(/<rt>(.*?)<\/rt>/g, "<rt>&thinsp;$1&thinsp;</rt>");
      return rts;
    });
    s = s.replace(/<\/rt><rt>/g, "</rt> <rt>");
  }

  if (s.trim() === "html") s = 'html(lang="zh-Hant-TW")';
  if (useHruby && /^\s*body$/.test(s)) {
    s = s.replace(/^(\s*)body$/, "$1body(class=\"han-init-context\")");
  }
  return s;
}

/** Parity: snapshot after kRuby / m3Ruby (before thinsp chain). */
export function jadeUnescapeStages(
  line: string,
  maps: FontMaps,
  useHruby = false,
): { afterKRuby: string; afterM3Ruby: string } {
  let s = line;
  s = expandKTags(s, maps, useHruby);
  s = s.replace(
    /([\u{f0000}-\u{fffff}])(?!<\/mark>)/gu,
    (ch) => astralToMarkup(ch, maps, useHruby),
  );
  s = s.replace(/[˙·]<rt>/g, "<rt>˙");
  const rubyTag = useHruby ? 'ruby class="zhuyin"' : "ruby";
  if (!useHruby) {
    s = s.replace(/(<\/rt>(?:[/→]<rt>.*?<\/rt>)+)(?!<rt>)/g, (m) => {
      const rts = m.replace(/<\/?rt>/g, "");
      return `${rts}</rt>`;
    });
  }
  const kcharQ =
    "(?:<mark>&#xf[0-9a-f]*;</mark>|<img src=\"img/k/[0-9a-f]+.png\">)";
  const altQ = `(?:(?:.|${kcharQ})(?:[:：](?:.|${kcharQ})*?)?)`;
  const altsQ = `\\*|\\*?(?:[(（]${altQ}?(?:[/／]${altQ})+[)）])+`;
  const kRuby = new RegExp(
    `(${kcharQ})(${altsQ})?<rt>(.*?)</rt>(?!</ruby>)`,
    "gu",
  );
  s = s.replace(kRuby, (_full, rb: string, alts: string | undefined, rt: string) => {
    const hexM = rb.match(/xf([0-9a-f]+)/i) ?? rb.match(/img\/k\/([0-9a-f]+)/i);
    const hex = hexM?.[1] ?? "0";
    const char = String.fromCodePoint(0xf0000 + parseInt(hex, 16));
    if (UNPRON_K.test(char)) return `${rb}${alts ?? ""}<rt>${rt}</rt>`;
    if (useHruby && alts) return `${rb}${alts}<${rubyTag}><rt>${rt}</rt></ruby>`;
    return `<${rubyTag}>${rb}<rt>${rt}</rt></ruby>${alts ?? ""}`;
  });
  const afterKRuby = s;
  const m3Ruby = new RegExp(
    `(～|\\(\\s+\\)|[^\\p{P}\\p{S}\\p{M}\\p{Z}])(${altsQ})?<rt>([^<>]*?)</rt>(?!</ruby>)`,
    "gu",
  );
  s = s.replace(m3Ruby, (_full, rb: string, alts: string | undefined, rt: string) => {
    if (useHruby && alts) return `${rb}${alts}<${rubyTag}><rt>${rt}</rt></ruby>`;
    return `<${rubyTag}>${rb}<rt>${rt}</rt></ruby>${alts ?? ""}`;
  });
  return { afterKRuby, afterM3Ruby: s };
}

/** Post-process full document: inline head assets (committed pug omits `include _head`). */
export function finalizePugDocument(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*include _head\.pug\s*$/.test(line)) continue;
    if (/^\s*meta\(charset='utf8'\)/.test(line)) {
      out.push(line);
      const indent = line.match(/^(\s*)/)?.[1] ?? "    ";
      out.push(`${indent}script(src='han.min.js')`);
      out.push(`${indent}link(rel="stylesheet" media="all" href="style.css")`);
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}


export function jadeUnescapeDocument(body: string, maps: FontMaps): string {
  const lines = body.split("\n").map((l) => jadeUnescapeLine(l, maps));
  return finalizePugDocument(lines.join("\n"));
}

const fontMapsCache = new Map<string, FontMaps>();

/** Production unescape: TS port of `font/jade-unescape.pl` + `finalizePugDocument`. */
export function unescapeDocument(root: string, body: string): string {
  let maps = fontMapsCache.get(root);
  if (!maps) {
    maps = loadFontMaps(root);
    fontMapsCache.set(root, maps);
  }
  let out = jadeUnescapeDocument(body, maps);
  if (!out.startsWith("\n")) out = "\n" + out;
  if (!out.endsWith("\n")) out += "\n";
  return out;
}