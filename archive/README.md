# Legacy dictionary → Pug generators

The Astro preview uses **`bun run gen:pug`** / **`bun run diff:pug`** (`lib/dic/`, `scripts/gen-pug.ts`). As of 2026-07-04, **`diff:pug` is green** on all 26 volumes and appendix `pug/*.pug` (raw byte identity vs committed).

| Role | Path | Status |
|------|------|--------|
| CP950 → UTF-8 | `lib/dic/cp950.ts` | Production (`recodeDicFile`) |
| Analyse + Pug body | `lib/dic/dic2pug.ts` | Production |
| Ruby unescape | `lib/dic/unescape.ts` | Production |
| Glyph GIF export | `crates/koktai-font` | Production (`bun run font:build`) |
| Historical C font tools | **`archive/font-hfn-c/`** | Reference; spellgen/resize/merge not ported |
| Historical py2 drivers | **`archive/gen.pl`** etc. | Superseded |
| Perl recode reference | `a-tsioh_sandbox/recode_utf8.pl` | Optional oracle (`RECODE_LEGACY_PERL=1` on `parity:stage recode`) |
| Perl unescape reference | `font/jade-unescape.pl` | `parity:stage unescape` oracle |
| Historical py3 analyse | `scripts/legacy-py3/` | `parity:stage analyse` oracle |

Do not delete committed `pug/*.pug`. Keep `scripts/legacy-py3/` for analyse parity until fully retired.