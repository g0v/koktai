import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFontJsonFromUsrfont } from "../../lib/font/gen-json.ts";

const root = join(import.meta.dir, "../..");

describe("gen-json from usrfont.lst", () => {
  test("fab6 matches committed m3.json (port of gen-json.pl)", () => {
    const latin1 = readFileSync(join(root, "font/usrfont.lst")).toString("latin1");
    const m3Noruby = JSON.parse(
      readFileSync(join(root, "font/m3_noruby.json"), "utf8"),
    ) as Record<string, string>;
    const built = buildFontJsonFromUsrfont(latin1, "m3", m3Noruby);
    const committed = JSON.parse(
      readFileSync(join(root, "font/m3.json"), "utf8"),
    ) as Record<string, string>;
    expect(built.fab6).toBe(committed.fab6);
    expect(built.fab6).toBe("ㄅㄚ");
  });
});