# koktai-font

Rust port of the legacy C libraries in `archive/font-hfn-c/`:

- **XFN** — 倚天新翰藝列印造字檔 (`xfn.h` / `xfn.c`)
- **CMEX UFP** — 倚天 CMEX 螢幕造字檔 (`cmexuf.h` / `cmexuf.c`)
- **`xfn2gif`** — CLI replacement for legacy `xfn2gif` (no libgd)

## Build

```sh
cargo build --release -p koktai-font
```

Binary: `target/release/xfn2gif`

## Usage

```sh
xfn2gif -i font/etp.xfn -o out.gif -t m3 -c fab6
```

Typeface flags match the C tool: `m`, `k`, `m3` (細明體 light / 方音).

## Tests

```sh
cargo test -p koktai-font
```

Uses `font/etp.xfn` and `archive/font-hfn-c/cmexufp.24m` when present.