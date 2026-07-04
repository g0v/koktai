import {
  wrapKaiFont,
  stripPe2Tags,
  replacePrivates,
  loadPrivateMapping,
} from "./pe2-text.ts";

const PUG_SHELL = `
doctype html
html
  head
    meta(charset='utf8')
  body
`;

function formatLine(line: string): string {
  return `      ${line}`;
}

function paragraphToPug(lines: string[], mapping: Record<string, string>): string {
  const out = [
    '    p(style="white-space: pre-wrap; font-family: monospace; font-size: 1rem").',
  ];
  for (const raw of lines) {
    let l = wrapKaiFont(raw);
    l = stripPe2Tags(l);
    l = replacePrivates(l, mapping).trim();
    out.push(formatLine(l));
  }
  if (lines.length <= 1) out.push("");
  return out.join("\n");
}

/** Appendix / plain text after recode_utf8 → pre-unescape Pug (matches txt2jade.py). */
export function txtTextToPugBody(txtUtf8: string, root: string): string {
  const mapping = loadPrivateMapping(root);
  const parts: string[] = [PUG_SHELL];
  let buf: string[] = [];

  const flush = () => {
    if (buf.length > 0) {
      parts.push(paragraphToPug(buf, mapping));
      buf = [];
    }
  };

  for (const raw of txtUtf8.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim()) buf.push(line);
    else flush();
  }
  flush();

  return parts.join("\n");
}