# Koktai structured readings

Provenance: 吳守禮《國臺對照活用辭典》 (26 `.dic` volumes, CP950 recoded).

License: CC-BY-SA 3.0 TW (inherited from source; see repo README).

Schema: `lib/extract/types.ts`

Regenerate:

```bash
bun run extract:readings
bun run export:tei
```

Optional full token streams (gitignored):

```bash
bun run extract:readings -- --full
```

Files:
- `koktai-sinogram-readings.jsonl` — per-sinogram blocks
- `koktai-word-readings.jsonl` — word entries (reduced taigi)
- `extract-stats.json` — corpus counters
- `extract-anomalies.jsonl` — parse/roundtrip issues
- `koktai-pron.tei.xml` — TEI pronunciation/usg layer for sinogram blocks