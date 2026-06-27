gen-json ::
	perl gen-json.pl k | sed '1 s/^/{\n/; $$ s/,$$/\n}/' > k.json
	perl gen-json.pl m3 | sed '1 s/^/{\n/; $$ s/,$$/\n}/' > m3.json

maps_to_gif ::
	python3 maps_to_gif.py
