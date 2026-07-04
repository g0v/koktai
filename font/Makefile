gen-json ::
	perl gen-json.pl k | sed '1 s/^/{\n/; $$ s/,$$/\n}/' > k.json
	perl gen-json.pl m3 | sed '1 s/^/{\n/; $$ s/,$$/\n}/' > m3.json

maps_to_gif ::
	cd .. && bun run gen:maps-gif

missings_to_gif ::
	cd .. && bun run gen:missing-gif

missings_to_png ::
	cd .. && bun run gen:missing-png
