use strict;
use JSON qw[decode_json];
use File::Slurp qw[slurp];
use Encode;
use FindBin '$Bin';

my $k = decode_json(slurp("$Bin/k.json"));
my $m3 = decode_json(slurp("$Bin/m3.json"));

while (<>) {
    Encode::_utf8_on($_);
    s{<k>(.*?)</k>}{k($1)}eg;
    s!&#xFc6a([1-9]);!chr(0x245f + $1)!eg;
    s!&#xF(....);!
        $m3->{$1} ? qq[<rt>$m3->{$1}</rt>] : qq[<img src="img/m3/$1.png">]
    !eg;
    Encode::_utf8_off($_);
    s/^html$/html(lang="zh-Hant-TW")/;
    print;
    if (/^(\s*)meta\(charset='utf8'\)/) {
        print "$1include _head.jade\n";
    }
}

sub k {
    my $str = shift;
    $str =~ s!&#xFc6a([1-9]);!chr(0x245f + $1)!eg;
    $str =~ s!&#xF([89af]...);!
        $k->{$1} ? qq[<rt>$k->{$1}</rt>] : qq[<mark>&#xF$1</mark>]
    !eg;
    $str =~ s!&#xF([^89af]...);!
        $k->{$1} ? qq[<rt>$k->{$1}</rt>] : qq[<img src="img/k/$1.png">]
    !eg;
    return $str;
}
#slurp()
#decode_json();
