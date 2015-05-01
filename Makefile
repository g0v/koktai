gen ::
	perl gen.pl | sh
	jade -P jade --out html

gen_ji ::
	perl gen_ji.pl | sh
	jade -P jade --out html
