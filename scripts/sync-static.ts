/**
 * Copy han/css/fonts/glyph PNGs into public/ for Astro static assets.
 */
import { cpSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

mkdirSync(pub, { recursive: true });
mkdirSync(join(pub, "font"), { recursive: true });
mkdirSync(join(pub, "img"), { recursive: true });

const copy = (from: string, to: string) => {
  if (!existsSync(from)) {
    console.warn(`  skip missing ${from}`);
    return;
  }
  cpSync(from, to, { recursive: true });
};

copy(join(root, "html/style.css"), join(pub, "style.css"));
copy(join(root, "html/han.min.css"), join(pub, "han.min.css"));
copy(join(root, "html/han.min.js"), join(pub, "han.min.js"));
copy(join(root, "html/font"), join(pub, "font"));
copy(join(root, "img/m3"), join(pub, "img/m3"));
copy(join(root, "img/k"), join(pub, "img/k"));

const badFontLink = join(pub, "img/font");
if (existsSync(badFontLink)) {
  rmSync(badFontLink, { recursive: true, force: true });
}

console.log("Synced static assets → public/");