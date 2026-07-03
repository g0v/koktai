gen-json ::
	perl gen-json.pl k | sed '1 s/^/{\n/; $$ s/,$$/\n}/' > k.json
	perl gen-json.pl m3 | sed '1 s/^/{\n/; $$ s/,$$/\n}/' > m3.json

maps_to_gif ::
	python3 maps_to_gif.py

missings_to_gif ::
	python3 missings_to_gif.py

missings_to_png :: missings_to_gif
	python3 rename_gifs.py k_missing && mkdir -p k && python ../a-tsioh_sandbox/gif_to_png.py k_missing k || true
	python3 rename_gifs.py m3_missing && mkdir -p m3 && python ../a-tsioh_sandbox/gif_to_png.py m3_missing m3 || true
