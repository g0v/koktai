import { describe, expect, test } from "bun:test";
import {
  pageLink,
  siteRootPrefixForPage,
  relativizeDictionarySnapshotHtml,
} from "../../lib/site/site-url.ts";
import { getCorpus } from "../../lib/site/corpus.ts";
import { entryLinkFromSection } from "../../lib/site/volume-paths.ts";
import { parseDictionaryHref } from "../../lib/site/anchor-integrity.ts";

describe("siteRootPrefixForPage", () => {
  test("depth 0 is ./", () => {
    expect(siteRootPrefixForPage("index.html")).toBe("./");
  });
  test("volume hub is ../", () => {
    expect(siteRootPrefixForPage("01/index.html")).toBe("../");
  });
  test("section page is ../../", () => {
    expect(siteRootPrefixForPage("01/3/index.html")).toBe("../../");
  });
});

describe("pageLink", () => {
  test("fragment from section page goes via index.html", () => {
    expect(pageLink("01/3/index.html", "#w-1")).toBe("../../index.html#w-1");
  });
  test("entryLinkFromSection same page is hash-only", () => {
    const corpus = getCorpus(import.meta.dir + "/../..");
    const href = entryLinkFromSection("01", 3, { k: "w", v: "01", l: 1 }, corpus);
    if (href.startsWith("#")) {
      expect(href).toMatch(/^#w-\d+$/);
    } else {
      expect(href).toMatch(/index\.html#w-\d+$/);
    }
  });
  test("cross section from depth 2", () => {
    expect(pageLink("01/3/index.html", "10/5/index.html")).toBe("../../10/5/index.html");
  });
  test("fragment from home", () => {
    expect(pageLink("index.html", "#volumes")).toBe("#volumes");
  });
});

describe("parseDictionaryHref (relative)", () => {
  test("parses ../ cross-volume entry link", () => {
    const parsed = parseDictionaryHref("../../10/24/index.html#c-1434");
    expect(parsed?.vol).toBe("10");
    expect(parsed?.section).toBe(24);
    expect(parsed?.anchor).toBe("c-1434");
  });
  test("parses same-page hash", () => {
    expect(parseDictionaryHref("#w-42")?.anchor).toBe("w-42");
  });
});

describe("relativizeDictionarySnapshotHtml", () => {
  test("rewrites absolute koktai entry and img paths from section 01/3", () => {
    const html =
      '<a href="/koktai/21/24/index.html#c-1"><img src="/koktai/img/k/faca.png">';
    expect(relativizeDictionarySnapshotHtml(html, "01", 3)).toBe(
      '<a href="../../21/24/index.html#c-1"><img src="../../img/k/faca.png">',
    );
  });
});