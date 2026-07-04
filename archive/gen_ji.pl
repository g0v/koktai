use 5.12.0;
for ('01'..'26') {
    my ($dic) = glob("*$_*.dic");
    say "perl a-tsioh_sandbox/recode_utf8.pl $dic | python2 a-tsioh_sandbox/analyse_char_entry.py | perl font/jade-unescape.pl > pug/ji_$_.pug"
}

