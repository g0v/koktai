# Legacy 倚天 font toolchain (C + libgd)

Archived from `font/hfn/` (2026-07). **Not required** for site build, `bun run gen:pug`, or glyph regen.

## Superseded by

| Legacy | Current |
|--------|---------|
| `xfn2gif` + `gd1.3` | `crates/koktai-font` → `target/release/xfn2gif` (`bun run font:build`) |
| `maps_to_gif` / missings (C era) | `scripts/font/`, `bun run regen:glyphs` |

## Still only here (font factory)

If you need to **rebuild** `etp.xfn`, CMEX user fonts, or spell fonts from `usrfont.lst` / `han.xfn`:

- `spellgen`, `resize`, `merge` (see `makefile`)
- CMEX **write** in `cmexuf.c` (Rust `koktai-font` reads CMEX + exports XFN glyphs only)

## Spec / reference

- `xfn.c`, `xfn.h`, `cmexuf.c`, `cmexuf.h`, `bitmap.c`, `tai.c`, `convert.c`
- `cmexufp.24m`, `cmexufp.15m`, `cmexufp.24k` — CMEX header templates (tests use `cmexufp.24m`)

Historical build (reference only):

```sh
cd gd1.3 && make clean all && cd ..
gcc --include stdlib.h xfn2gif.c xfn.c convert.c tai.c bitmap.c gd1.3/libgd.a -o xfn2gif
```