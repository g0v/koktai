import { describe, expect, test } from "bun:test";
import { rebaseDictionarySnapshotHtml } from "../../lib/site/site-base.ts";

describe("rebaseDictionarySnapshotHtml", () => {
  test("rewrites /koktai/ links and images to root base", () => {
    const html =
      '<a href="/koktai/21/24/index.html#c-1"><img src="/koktai/img/k/faca.png">';
    expect(rebaseDictionarySnapshotHtml(html, "/")).toBe(
      '<a href="/21/24/index.html#c-1"><img src="/img/k/faca.png">',
    );
  });

  test("prefixes root-relative /img/ when site is under /koktai/", () => {
    const html = '<img src="/img/k/fa42.png">';
    expect(rebaseDictionarySnapshotHtml(html, "/koktai/")).toBe(
      '<img src="/koktai/img/k/fa42.png">',
    );
  });

  test("leaves already-correct base unchanged", () => {
    const html = '<a href="/koktai/01/1/index.html#w-1"><img src="/koktai/img/k/fa42.png">';
    expect(rebaseDictionarySnapshotHtml(html, "/koktai/")).toBe(html);
  });
});

import { legacyPlainText, absolutizeDictionaryImgSrc } from "../../lib/site/legacy-text.ts";

describe("horizontalBopomofo via legacyPlainText", () => {
  test("maps vertical 丨 to ㄧ in plain syllable labels", () => {
    expect(legacyPlainText("丨～丨ㄥˋ")).toBe("ㄧ～ㄧㄥˋ");
  });
});

describe("absolutizeDictionaryImgSrc", () => {
  test("converts relative image paths to base-prefixed paths", () => {
    const html = '繃<img src="img/k/fbba.png">／鬥鬦';
    expect(absolutizeDictionaryImgSrc(html, "./")).toBe(
      '繃<img src="./img/k/fbba.png">／鬥鬦',
    );
    expect(absolutizeDictionaryImgSrc(html, "/")).toBe(
      '繃<img src="/img/k/fbba.png">／鬥鬦',
    );
  });

  test("handles single quotes and double quotes", () => {
    const htmlDouble = '<img src="img/m3/fbb9.png">';
    const htmlSingle = "<img src='img/m3/fbb9.png'>";
    expect(absolutizeDictionaryImgSrc(htmlDouble, "./")).toBe(
      '<img src="./img/m3/fbb9.png">',
    );
    expect(absolutizeDictionaryImgSrc(htmlSingle, "./")).toBe(
      "<img src='./img/m3/fbb9.png'>",
    );
  });
});