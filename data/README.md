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
- koktai-sinogram-readings.jsonl — per-sinogram blocks.
- koktai-word-readings.jsonl — word entries with reduced 台語 tokens.
- extract-stats.json — corpus counters and coverage.
- extract-anomalies.jsonl — preserved parse/round-trip anomaly records.
- koktai-pron.tei.xml — TEI pronunciation/usg layer for sinogram blocks.

Current extraction stats: 26 volumes, 11,810 sinogram blocks, 34,382 word records, 45,067 senses, 31,143 reading lines, 31,061 parsed reading lines, 480,942 reading values, 0 round-trip failures, 0 anomalies.
