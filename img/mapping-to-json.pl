use utf8;
my %x;
while (<>) {
    next if /inf/;
s{(....)\.png}{} or next;
my $big5 = $1;
my $candidates = '';
while (s/\/([^.]+).png//) {
$candidates.= chr hex $1;
}
$x{$big5} = $candidates;
}
use Mojo::JSON qw[ encode_json ];
my $x = encode_json(\%x);
print $x;
