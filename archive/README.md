# Legacy dictionary → Pug generators

The Astro site uses **`bun run gen:pug`** / **`bun run diff:pug`** (`lib/dic/`, `scripts/gen-pug.ts`). **CI gate:** `bun run diff:pug` (byte-identical vs committed `pug/*.pug`).

## Production (Bun + TypeScript + Rust)

| Role | Path |
|------|------|
| CP950 → UTF-8 | `lib/dic/cp950.ts` |
| Analyse + Pug body | `lib/dic/dic2pug.ts`, `lib/dic/txt2pug.ts` |
| Ruby unescape | `lib/dic/unescape.ts` |
| Glyph GIF export | `crates/koktai-font` (`bun run font:build`) |
| `k.json` / `m3.json` from `usrfont.lst` | `bun run gen:font-json -- k\|m3` (`lib/font/gen-json.ts`) |

**Site build needs only:** `bun install`, `bun run check`, `bun test`, `bun run diff:pug`, `bun run build`. Optional: `cargo build -p koktai-font` when regenerating glyphs.

## Archived reference (not required for build)

| Role | Path | Notes |
|------|------|--------|
| Historical C font factory | **`archive/font-hfn-c/`** | spellgen/resize/merge/CMEX write |
| Historical py2 drivers | **`archive/gen.pl`** etc. | Superseded |
| Perl `gen-json` | **`archive/gen-json.pl`** | Superseded by `gen:font-json` |
| Perl recode reference | `a-tsioh_sandbox/recode_utf8.pl` | `RECODE_LEGACY_PERL=1` + `parity:stage recode` |
| Perl unescape reference | `font/jade-unescape.pl` | `PARITY_LEGACY=1` + `parity:stage unescape` |
| Py3 analyse oracle | **`archive/legacy-py3-parity/`** | `PARITY_LEGACY=1` + `parity:stage analyse` |

Do not delete committed `pug/*.pug`. Legacy Perl/Python oracles are opt-in via **`PARITY_LEGACY=1`** (and **`RECODE_LEGACY_PERL=1`** for Perl recode only).