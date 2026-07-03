use 5.12.0;
for ('01'..'26') {
    my ($dic) = glob("*$_*.dic");
    say "perl a-tsioh_sandbox/recode_utf8.pl $dic | python2 a-tsioh_sandbox/dic2jade.py | perl font/jade-unescape.pl > jade/$_.jade"
}

my @txts = ('dic-cont.txt', 'ph-comp.txt', 'phsource', 'preface1.dic', 'mytaiin8.txt');
for (@txts) {
    my ($file) = $_;
    $_ =~ s/\.[^.]+$//;
    say "perl a-tsioh_sandbox/recode_utf8.pl $file | python2 a-tsioh_sandbox/txt2jade.py | perl font/jade-unescape.pl > jade/$_.jade"
}

