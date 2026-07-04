gen ::
	@echo "Use: bun run gen:pug  (see README-preview.md). Legacy shell: archive/gen.pl | sh"
	npx pug -P pug --out html

gen_ji ::
	@echo "Historical py2 flow moved to archive/gen_ji.pl; no current Bun pipeline uses ji_*.pug"

gen_tai ::
	@echo "Historical py2 flow moved to archive/gen_tai.pl; no current Bun pipeline uses tai.pug extraction"
