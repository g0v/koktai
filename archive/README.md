# Legacy dictionary → Pug generators

The Astro preview uses **`bun run gen:pug`** / **`bun run diff:pug`** (`lib/dic/`, `scripts/gen-pug.ts`). As of 2026-07-04, **`diff:pug` is green** on all 26 volumes and appendix `pug/*.pug` (raw byte identity vs committed).

**Only the three py2 command drivers are archived here:** `gen.pl`, `gen_ji.pl`, and `gen_tai.pl`. Production uses Perl `recode_utf8.pl`, **TS analyse** (`lib/dic/dic2pug.ts`), Perl `font/jade-unescape.pl`, and TS finalize — see `lib/dic/pipeline.ts` / `defaultPipelineMode`. **`scripts/legacy-py3/`** stays on disk for **`parity:stage analyse`** only; do not move or delete it.

| Role | Path | Status |
|------|------|--------|
| CP950 → UTF-8 | `a-tsioh_sandbox/recode_utf8.pl` | Production (`recodeDicFile`) |
| Analyse + Pug body | `lib/dic/dic2pug.ts` | Production (default `analyse: "ts"`) |
| Ruby unescape | `font/jade-unescape.pl` | Production (`perlUnescapeDocument`) |
| Historical py2 full driver | **`archive/gen.pl`** | Superseded; printed py2 `dic2jade` / `txt2jade` commands |
| Historical py2 ji driver | **`archive/gen_ji.pl`** | Superseded; printed `analyse_char_entry.py` commands for `ji_*.pug`; not used by current site |
| Historical py2 tai driver | **`archive/gen_tai.pl`** | Superseded; printed `dic2jade.py` commands for old tai extraction; not used by current site |
| Original py2 analyse | `a-tsioh_sandbox/dic2jade.py` | Reference only; py3 ports under `scripts/legacy-py3/` |
| Historical py3 dictionary analyse | `scripts/legacy-py3/dic2jade.py`, `analyse_*.py` | Reference oracle for `parity:stage analyse`; NOT archived |

Do not delete committed `pug/*.pug` or production Perl scripts in the table; only the archived py2 command drivers live here. Keep `scripts/legacy-py3/` until recode/unescape ports finish. Pure TS CP950 / TS unescape ports are optional follow-ups — see `docs/pug-reproducibility.md`.