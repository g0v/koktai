# Usage: perl hamming.pl | sort -n | head
use strict;
use Phash::FFI;
my $h = 1205809324939215306;
binmode STDOUT, ':utf8';
local @ARGV = 'hanazono.phash.json';
while (<>) {
    next unless /"(\w+)": (\d+)/;
    print Phash::FFI::ph_hamming_distance($h, int $2), " ", $1, " ", chr hex $1, $/;
}
