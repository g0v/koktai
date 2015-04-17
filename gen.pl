use 5.12.0;
for ('01'..'26') {
    my ($dic) = glob("*$_*.dic");
    say "perl a-tsioh_sandbox/recode_utf8.pl $dic | python a-tsioh_sandbox/dic2jade.py | perl font/jade-unescape.pl > jade/$_.jade"
}

