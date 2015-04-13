use 5.12.0;
for ('01'..'26') {
    my ($dic) = glob("*$_*.dic");
    say "perl a-tsioh_sandbox/recode_utf8.pl $dic | python a-tsioh_sandbox/dic2jade.py | piconv -f utf8 -t ascii -C 1024 | perl font/jade-unescape.pl > jade/$_.jade"
}

