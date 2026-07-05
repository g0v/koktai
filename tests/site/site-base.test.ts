import { describe, expect, test } from "bun:test";
import { rebaseDictionarySnapshotHtml } from "../../lib/site/site-base.ts";

describe("rebaseDictionarySnapshotHtml", () => {
  test("rewrites /koktai/ links to configured base", () => {
    const html =
      '<a href="/koktai/21/24/index.html#c-1"><img src="/koktai/img/k/faca.png">';
    expect(rebaseDictionarySnapshotHtml(html, "/")).toBe(
      '<a href="/21/24/index.html#c-1"><img src="/img/k/faca.png">',
    );
  });

  test("leaves already-correct base unchanged", () => {
    const html = '<a href="/koktai/01/1/index.html#w-1">';
    expect(rebaseDictionarySnapshotHtml(html, "/koktai/")).toBe(html);
  });
});

import { legacyPlainText } from "../../lib/site/legacy-text.ts";

describe("horizontalBopomofo via legacyPlainText", () => {
  test("maps vertical 丨 to ㄧ in plain syllable labels", () => {
    expect(legacyPlainText("丨～丨ㄥˋ")).toBe("ㄧ～ㄧㄥˋ");
  });
});