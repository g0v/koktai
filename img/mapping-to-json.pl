use utf8;
my %x;
while (<>) {
s{<mark>&#xf(....);</mark>}{} or next;
my $big5 = $1;
my $candidates = [];
while (s/&#x([^;]+);//) {
push @$candidates, $1;
}
$x{$big5} = $candidates;
}
use Mojo::JSON qw[ encode_json ];
my $x = encode_json(\%x);
print $x;
