gen ::
	perl gen.pl | sh
	jade -P jade --out html

gen_ji ::
	perl gen_ji.pl | sh
	jade -P jade --out html

gen_tai ::
	perl gen_tai.pl | sh
	grep 'div.lang 台' -h -r jade -A 1| grep -v 'div.lang 台' | sed 's/^\s\+div\.text\s//g' | grep -v '^--$' > tai.jade 
