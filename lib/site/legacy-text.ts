import { stripPe2Tags, wrapKaiFont } from "../dic/pe2-text.ts";
import { jadeUnescapeLine, loadFontMaps } from "../dic/unescape.ts";

const fontMaps = loadFontMaps(process.cwd());
const ASTRAL_PUA = /[\u{f0000}-\u{fffff}]/gu;
const RAW_K_TAG = /<\/?k>|k>/g;
const STRAY_K_BEFORE_CJK = /(^|[^\p{L}\p{N}])k(?=\s*[\p{Script=Han}\u{f0000}-\u{fffff}])/gu;

function stripKaiTagFragments(text: string): string {
  return text.replace(RAW_K_TAG, "").replace(STRAY_K_BEFORE_CJK, "$1");
}


function puaCode(ch: string): string {
  return (ch.codePointAt(0)! - 0xf0000).toString(16).padStart(4, "0");
}

function plainPua(ch: string): string {
  const code = puaCode(ch);
  return fontMaps.m3Noruby[code] ?? fontMaps.m3[code] ?? fontMaps.k[code] ?? fontMaps.mapping[ch] ?? "□";
}

export function legacyPlainText(text: string): string {
  let out = stripKaiTagFragments(stripPe2Tags(text));
  for (let i = 0; i < 8; i += 1) {
    ASTRAL_PUA.lastIndex = 0;
    if (!ASTRAL_PUA.test(out)) break;
    ASTRAL_PUA.lastIndex = 0;
    out = out.replace(ASTRAL_PUA, plainPua);
  }
  ASTRAL_PUA.lastIndex = 0;
  return stripKaiTagFragments(out.replace(ASTRAL_PUA, "□"));
}

export function renderLegacyText(text: string): string {
  return stripKaiTagFragments(jadeUnescapeLine(stripPe2Tags(wrapKaiFont(text)), fontMaps, true));
}
