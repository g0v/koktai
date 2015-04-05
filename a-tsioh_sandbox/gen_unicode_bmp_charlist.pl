use utf8;
use Unicode::Unihan;
use Encode;
my $uh = Unicode::Unihan->new;

for ((0x3400..0x4DB5), (0x4E00..0x9FD0)) {
    $_ = chr $_;
    print $_, $/ if $uh->IRG_TSource($_) and not $uh->TraditionalVariant($_) and '?' eq Encode::encode('cp950' => $_);
}
