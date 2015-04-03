# Usage: perl hamming.pl | sort -n | head
use strict;
use Phash::FFI;
use FindBin '$Bin';
use JSON qw[decode_json];
use File::Slurp qw[slurp];
my $koktai_k = decode_json(slurp("$Bin/koktai-k.phash.json"));
my $hanazono = decode_json(slurp("$Bin/hanazono.phash.json"));
print <DATA>;
for my $big5 (sort keys %$koktai_k) {
    my $hash = $koktai_k->{$big5};
    my $best = 10; # threshold
    my %match;
    for my $uni (sort keys %$hanazono) {
        my $score = Phash::FFI::ph_hamming_distance($hash, $hanazono->{$uni});
        next unless $score <= $best;
        $best = $score;
        $match{$score} .= chr hex $uni;
    }
    print "<mark>&#xf$big5;</mark><tt>$big5=";
    print "<large>$match{$best}</large>($best)</tt><br/>\n";
}
__DATA__
<!DOCTYPE html><html lang="zh-Hant-TW"><head> <meta charset="utf8"></head>
<style>
    @font-face {
          font-family: 'k';
          src: url('../html/font/koktai-k.woff') format('woff');
    }
    mark {
        font-family: 'k';
        font-size: 48px;
    }
    large {
        font-size: 48px;
    }
</style>
</head><body>
