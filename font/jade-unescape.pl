use strict;
use JSON qw[decode_json];
use File::Slurp qw[slurp];
use Encode;
use FindBin '$Bin';

my $k = decode_json(scalar slurp("$Bin/k.json"));
my $m3 = decode_json(scalar slurp("$Bin/m3.json"));
my $mapping = decode_json(slurp("$Bin/../a-tsioh_sandbox/mapping.json"));

while (<>) {
    Encode::_utf8_on($_);
    s{<k>(.*?)</k>}{k($1)}eg;
    s|([\x{Fc6a1}-\x{Fc6a9}])(?!</mark>)(?!</rt>)|chr(0x245f + ord($1) - 0xFc6a0)|eg;
    s|([\x{Fc000}-\x{Fcfff}])(?!</mark>)(?!</rt>)|
        my $code = sprintf('%04x', ord($1) - 0xF0000);
        $m3->{$code} ? qq[$m3->{$code}] : qq[<img src="img/m3/$code.png">]
    |eg;
    s|([\x{F0000}-\x{Fffff}])(?!</mark>)(?!</rt>)|
        my $code = sprintf('%04x', ord($1) - 0xF0000);
        $m3->{$code} ? qq[<rt>$m3->{$code}</rt>] : qq[<img src="img/m3/$code.png">]
    |eg;
    Encode::_utf8_off($_);
    s/^html$/html(lang="zh-Hant-TW")/;
    print;
    if (/^(\s*)meta\(charset='utf8'\)/) {
        print "$1include _head.jade\n";
    }
}

sub k {
    my $str = shift;
    $str =~ s!([\x{Fc6a1}-\x{Fc6a9}])!chr(0x245f + ord($1) - 0xFc6a0)!eg;
    $str =~ s!([\x{F8000}-\x{Fafff}\x{Ff000}-\x{Fffff}])!
        my $code = sprintf('%04x', ord($1) - 0xF0000);
        $mapping->{$1} || ($k->{$code} ? qq[<rt>$k->{$code}</rt>] : qq[<mark>&#xf$code;</mark>])
    !eg;
    $str =~ s!([\x{F0000}-\x{F7fff}\x{Fb000}-\x{Fefff}])!
        my $code = sprintf('%04x', ord($1) - 0xF0000);
        $mapping->{$1} || ($k->{$code} ? qq[<rt>$k->{$code}</rt>] : qq[<img src="img/k/$1.png">])
    !eg;
    return $str;
}
#slurp()
#decode_json();
