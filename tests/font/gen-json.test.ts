import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFontJsonFromUsrfont } from "../../lib/font/gen-json.ts";

const root = join(import.meta.dir, "../..");

describe("gen-json from usrfont.lst", () => {
  test("m3.json full parity with committed maps (Perl gen-json.pl baseline)", () => {
    const latin1 = readFileSync(join(root, "font/usrfont.lst")).toString("latin1");
    const m3Noruby = JSON.parse(
      readFileSync(join(root, "font/m3_noruby.json"), "utf8"),
    ) as Record<string, string>;
    const built = buildFontJsonFromUsrfont(latin1, "m3", m3Noruby);
    const committed = JSON.parse(
      readFileSync(join(root, "font/m3.json"), "utf8"),
    ) as Record<string, string>;
    expect(Object.keys(built).length).toBe(Object.keys(committed).length);
    for (const [k, v] of Object.entries(committed)) {
      expect(built[k]).toBe(v);
    }
  });

  test("fab6 is ㄅㄚ", () => {
    const latin1 = readFileSync(join(root, "font/usrfont.lst")).toString("latin1");
    const m3Noruby = JSON.parse(
      readFileSync(join(root, "font/m3_noruby.json"), "utf8"),
    ) as Record<string, string>;
    const built = buildFontJsonFromUsrfont(latin1, "m3", m3Noruby);
    expect(built.fab6).toBe("ㄅㄚ");
  });

  test("k.json full parity with committed maps", () => {
    const latin1 = readFileSync(join(root, "font/usrfont.lst")).toString("latin1");
    const m3Noruby = JSON.parse(
      readFileSync(join(root, "font/m3_noruby.json"), "utf8"),
    ) as Record<string, string>;
    const built = buildFontJsonFromUsrfont(latin1, "k", m3Noruby);
    const committed = JSON.parse(
      readFileSync(join(root, "font/k.json"), "utf8"),
    ) as Record<string, string>;
    expect(Object.keys(built).length).toBe(Object.keys(committed).length);
    for (const [k, v] of Object.entries(committed)) {
      expect(built[k]).toBe(v);
    }
  });
});