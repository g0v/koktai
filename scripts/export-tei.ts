import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractAll } from "../lib/extract/extract.ts";
import type { Reading, ReadingLine, SinogramEntry, Usage } from "../lib/extract/types.ts";

const REPO_URL = "https://github.com/g0v/koktai";
const ZENODO_DOI = "10.5281/zenodo.1308746";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function usgXml(u: Usage): string {
  switch (u.dim) {
    case "register":
      return `<usg type="socioCultural">${xmlEscape(u.value)}</usg>`;
    case "geo":
      return `<usg type="geographic">${xmlEscape(u.value)}</usg>`;
    case "source":
      return `<bibl>${xmlEscape(u.value)}</bibl>`;
    case "frequency":
      return `<usg type="frequency">${xmlEscape(u.value)}</usg>`;
    case "phenomenon":
    case "translation":
      return `<usg type="hint">${xmlEscape(u.value)}</usg>`;
    case "attitude":
      return `<usg type="attitude">${xmlEscape(u.value)}</usg>`;
    case "certainty":
      return "";
    case "other":
      return `<note>${xmlEscape(u.value)}</note>`;
    default:
      return `<note>${xmlEscape(u.value)}</note>`;
  }
}

function pronXml(r: Reading): string {
  const cert = r.usages.some((u) => u.dim === "certainty") ? ' cert="unknown"' : "";
  const inner = [
    xmlEscape(r.zhuyin),
    ...r.usages.flatMap((u) => {
      if (u.dim === "certainty") return [];
      return [usgXml(u)];
    }),
  ].join("");
  return `<pron notation="TW-zhuyin"${cert}>${inner}</pron>`;
}

function readingLineNoteXml(line: ReadingLine): string {
  const text = line.note ?? line.raw;
  return `<note type="${xmlEscape(line.source)}">${xmlEscape(text)}</note>`;
}

function readingsFormXml(line: ReadingLine): string {
  const resp = xmlEscape(line.source);
  const prons = line.readings.map((r) => pronXml(r)).join("");
  return `<form type="readings" resp="${resp}">${prons}</form>`;
}

function entryXml(e: SinogramEntry): string {
  const n = `${e.volume}-${e.line}`;
  const headPron = e.headZhuyin
    ? `<pron notation="TW-zhuyin">${xmlEscape(e.headZhuyin)}</pron>`
    : "";
  const formHead = `<form><orth>${xmlEscape(e.han)}</orth>${headPron}</form>`;
  const etym = e.fanqie
    ? `<etym type="fanqie">${xmlEscape(e.fanqie)}</etym>`
    : "";

  const lineParts = e.readingLines.flatMap((line) => {
    if (!line.parsed) {
      return [readingLineNoteXml(line)];
    }
    const parts: string[] = [readingsFormXml(line)];
    if (line.note) {
      parts.push(`<note type="${xmlEscape(line.source)}">${xmlEscape(line.note)}</note>`);
    }
    return parts;
  });

  return `<entryFree type="sinogram" n="${n}">${formHead}${etym}${lineParts.join("")}</entryFree>`;
}

function teiHeader(): string {
  return `<teiHeader>
  <fileDesc>
    <titleStmt>
      <title>國臺對照活用辭典 — structured pronunciation layer</title>
      <author>吳守禮</author>
      <respStmt>
        <resp>structured extraction</resp>
        <name>g0v/koktai</name>
      </respStmt>
    </titleStmt>
    <publicationStmt>
      <availability status="free">
        <licence target="https://creativecommons.org/licenses/by-sa/3.0/tw/">CC-BY-SA 3.0 TW</licence>
      </availability>
      <ref target="${REPO_URL}">${REPO_URL}</ref>
    </publicationStmt>
    <sourceDesc>
      <bibl>吳守禮《國臺對照活用辭典》</bibl>
      <relatedItem type="host" target="https://doi.org/${ZENODO_DOI}">
        <title>XML-TEI edition (Pierre Magistry)</title>
        <identifier type="DOI">${ZENODO_DOI}</identifier>
        <note>Join key: headword orth + volume; enriches unparsed reading notes in that edition.</note>
      </relatedItem>
    </sourceDesc>
  </fileDesc>
</teiHeader>`;
}

export function buildTei(entries: SinogramEntry[]): string {
  const body = entries.map((e) => entryXml(e)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
${teiHeader()}
<text>
<body>
${body}
</body>
</text>
</TEI>
`;
}

function isMain(importMeta: ImportMeta): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(importMeta.url) === entry;
}

if (isMain(import.meta)) {
  const root = process.cwd();
  const outPath = join(root, "data", "koktai-pron.tei.xml");
  const { sinograms } = extractAll(root);
  const xml = buildTei(sinograms);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, xml, "utf8");
  console.log(`Wrote ${sinograms.length} sinogram entries to ${outPath}`);
}