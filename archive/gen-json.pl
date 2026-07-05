use strict;
use utf8;
use JSON;
use File::Slurp qw[slurp];
use FindBin '$Bin';
binmode STDOUT, ":utf8";
my %seen;
my $bpmf = {
  "1"=> "ㄅ", "q"=> "ㄆ", "a"=> "ㄇ", "z"=> "ㄈ", 
  "2"=> "ㄉ", "w"=> "ㄊ", "s"=> "ㄋ", "x"=> "ㄌ",
  "e"=> "ㄍ", "d"=> "ㄎ", "c"=> "ㄏ",
  "r"=> "ㄐ", "f"=> "ㄑ", "v"=> "ㄒ",
  "5"=> "ㄓ", "t"=> "ㄔ", "g"=> "ㄕ", "b"=> "ㄖ",
  "y"=> "ㄗ", "h"=> "ㄘ", "n"=> "ㄙ",

  "u"=> "ㄧ", "j"=> "ㄨ", "m"=> "ㄩ",

  "8"=> "ㄚ", "i"=> "ㄛ", "k"=> "ㄜ", ","=> "ㄝ",
  "9"=> "ㄞ", "o"=> "ㄟ", "l"=> "ㄠ", "."=> "ㄡ",
  "0"=> "ㄢ", "p"=> "ㄣ", ";"=> "ㄤ", "/"=> "ㄥ",
  "-"=> "ㄦ" , "'"=> "ㄇ〾", "Y"=>"ㆡ",

  "!"=> "ㆠ", "A"=> "ㆬ", "@"=> "ㄉ〾", "E"=> "ㆣ",
  "C"=> "ㄬ", "R"=> "ㆢ",

  "U"=> "ㆪ", "J"=> "ㆫ", "*"=> "ㆩ", "K"=> "ㄜ〾",
  "]"=> "ㆤ", "}"=> "ㆥ", "("=> "ㆮ", "L"=> "ㆯ",
  "["=> "ㆦ", "{"=> "ㆧ", ":"=> "ㆲ",
  "+"=> "ㆭ", "\$"=> "ㆱ", "#"=> "ㆰ",  "="=> "ㄫ",
  "&"=> "ㆨ"
};

# neutral tone mark: non-ruby prefix or in-ruby tone position -> move to in-ruby prefix
my @tones_prefix;
@tones_prefix[15] = "˙";

my @tones = ('', '',
    "ˊ",   "ˇ",   "ˋ",
    "˪",   "˫",   "ㆷ",  "ㆷ̇",
    "ㆴ",  "ㆴ̇", "ㆶ",  "ㆶ̇",
    "ㆵ",  "ㆵ̇", "",
);

my $m3_noruby = decode_json(scalar slurp("$Bin/../font/m3_noruby.json"));
my %char_to_m3 = reverse %$m3_noruby;
my $json_ascii_escape = JSON->new->ascii(1);

my $font_target = $ARGV[0];
local @ARGV = 'usrfont.lst';
while (<>) {
    next if /^\./;
    /^(m3|k) +(\S)(\S) +(.+),(\d+)/ or exit print $_;
    my ($font, $hi, $lo, $keys, $tone) = ($1, sprintf("%02x", ord $2), sprintf("%02x", ord $3), $4, $5);
    next unless $font eq $font_target;
    $keys = join '', map { map_bpmf($_) } split //, $keys;
    print qq!"$hi$lo": "$tones_prefix[$tone]$keys$tones[$tone]",\n!;
}


sub map_bpmf {
    my $key = shift;
    my $char = $bpmf->{$key};
    if ($char =~ /〾/ && $char_to_m3{$char}) {
        $char = chr(hex($char_to_m3{$char}) + 0xF0000);
        my $escaped = JSON->new->ascii(1)->encode($char);
        $escaped =~ s/^"(.*)"$/$1/;
        return $escaped;
    } else {
        return $char;
    }
}
