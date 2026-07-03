use utf8;
use strict;
use JSON;
use File::Slurp qw[slurp];
use Encode;
use FindBin '$Bin';

# --hruby: simulate `ruby-position: inter-character;` using 萌典 moedict's <hruby>
# (still does not display good for rubies without the base text)
# otherwise use `ruby-position: over;`
my $use_hruby = grep(/^--hruby$/, @ARGV);

my $json_utf16 = JSON->new->utf8(1);
my $k = $json_utf16->decode(scalar slurp("$Bin/k.json"));
my $m3 = $json_utf16->decode(scalar slurp("$Bin/m3.json"));
my $mapping = $json_utf16->decode(scalar slurp("$Bin/../a-tsioh_sandbox/mapping.json"));
my $m3_noruby = $json_utf16->decode(scalar slurp("$Bin/m3_noruby.json"));

while (<>) {
    Encode::_utf8_on($_);
    s{<k>(.*?)</k>}{k($1)}eg;
    s{([\x{F0000}-\x{Fffff}])(?!</mark>)}{m3($1)}eg;
    # neutral tone mark: non-ruby prefix or in-ruby tone position -> move to in-ruby prefix
    s|[˙·]<rt>|<rt>˙|g;

    # the former will be parsed and replaced with <hruby> by han.min.js
    my $ruby = $use_hruby ? qq[ruby class="zhuyin"] : qq[ruby];
    if (!$use_hruby) {
        # merge rts separated by mark notations, excluding consecutive rts meant for multiple syllables
        # before merging: 技<rt>ㄍㄧ˫</rt>術<rt>ㄙㄨㆵ ͘</rt>→<rt>ㄍㄧ</rt><rt>ㄙㄨㆵ ͘</rt>
        # expected: <ruby>技<rt>ㄍㄧ˫</rt></ruby><ruby>術<rt>ㄙㄨㆵ ͘</rt></ruby>→<rt>ㄍㄧ</rt><rt>ㄙㄨㆵ ͘</rt>
        s{(</rt>(?:[/→]<rt>.*?</rt>)+)(?!<rt>)}{
            my $rts = $1;
            $rts =~ s|</?rt>||g;
            qq[$rts</rt>]
        }eg;
    }

    # place ruby on the base character
    my $kchar = qr!<mark>&#xf[0-9a-f]*+;</mark>|<img src="img/k/[0-9a-f]+.png">!;
    my $exp = qr/[:：](?:.|${kchar})*?/;
    my $alt = qr/(?:.|${kchar})${exp}?/;
    my $alts = qr{\*|\*?(?:[(（]${alt}?(?:[/／]${alt})+[)）])+};
    # k font
    s{(<mark>&#xf([0-9a-f]*+);</mark>|<img src="img/k/([0-9a-f]+).png">)($alts)?<rt>(.*?)</rt>(?!</ruby>)}{
        my ($rb, $alts, $rt) = ($1, $4, $5);
        my $char = chr(hex($2 || $3) + 0xF0000);
        # prevent ruby on unpronounceable characters
        ($char =~ /[\x{Ffa72}-\x{Ffa74}\x{Ffaa1}-\x{Ffaad}]/) ? qq[$rb$alts<rt>$rt</rt>]
            : (($use_hruby && $alts) ? qq[$rb$alts<$ruby><rt>$rt</rt></ruby>] : qq[<$ruby>$rb<rt>$rt</rt></ruby>$alts])
    }eg;
    # m3 font, prevent ruby on unpronounceable characters
    s{(～|\(\s+\)|[^\p{P}\p{S}\p{M}\p{Z}])($alts)?<rt>([^<>]*?)</rt>(?!</ruby>)}{
        my ($rb, $alts, $rt) = ($1, $2, $3);
        ($use_hruby && $alts) ? qq[$rb$alts<$ruby><rt>$rt</rt></ruby>] : qq[<$ruby>$rb<rt>$rt</rt></ruby>$alts]
    }eg;

    if ($use_hruby) {
        # wrap remaining rt into hruby
        s|(<rt>[^<>]*?</rt>)(?!</ruby>)|<$ruby>$1</ruby>|g;
    }
    if (!$use_hruby) {
        # join consecutive rubies, with spaces around rt text
        # notice: .*? should only be used within an immediately closed html element pattern
        my $char = qr{.|<mark>.*?</mark>|<img .*?>};
        s{((?:<ruby>(?:$char<rt>.*?</rt>)*</ruby>)+)}{
            my $rts = $1;
            $rts =~ s|<ruby></ruby>||g;
            $rts =~ s|<rt>(.*?)</rt>|<rt>&thinsp;$1&thinsp;</rt>|g;
            $rts
        }eg;
        # put a space between bare rts
        s{</rt><rt>}{</rt> <rt>}g;
    }

    Encode::_utf8_off($_);
    s/^html$/html(lang="zh-Hant-TW")/;
    if ($use_hruby) {
        s/^(\s*)body$/$1body(class="han-init-context")/;
    }
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
        $mapping->{$1} || ($k->{$code} ? qq[<rt>] . orient_rt($k->{$code}) . qq[</rt>] : qq[<mark>&#xf$code;</mark>])
    !eg;
    $str =~ s!([\x{F0000}-\x{F7fff}\x{Fb000}-\x{Fefff}])!
        my $code = sprintf('%04x', ord($1) - 0xF0000);
        $mapping->{$1} || ($k->{$code} ? qq[<rt>] . orient_rt($k->{$code}) . qq[</rt>] : qq[<img src="img/k/$code.png">])
    !eg;
    return $str;
}

sub m3 {
    my ($str, $no_inner_m3) = @_;
    my $inner_m3 = $no_inner_m3 ? sub { @_[0] } : sub { m3(@_[0], 1) }; # for expanding m3_noruby within expanded m3
    $str =~ s|([\x{Fc6a1}-\x{Fc6a9}])(?!</mark>)|chr(0x245f + ord($1) - 0xFc6a0)|eg;
    $str =~ s|([\x{F0000}-\x{Fffff}])(?!</mark>)|
        my $code = sprintf('%04x', ord($1) - 0xF0000);
        ($m3_noruby->{$code}) ? 
            ($m3_noruby->{$code} =~ /〾/) ? qq[<img src="img/m3/$code.png">] # use image if containing 〾
                : (qq[$m3_noruby->{$code}])
            : $m3->{$code} ? qq[<rt>] . orient_rt($inner_m3->($m3->{$code})) . qq[</rt>]
            : qq[<img src="img/m3/$code.png">]
    |eg;
    return $str;
}

sub orient_rt {
    my $rt = shift;
    if (!$use_hruby) {
        $rt =~ s/ㄧ/丨/g;
        $rt =~ s/ㆪ/ㆳ/g;
    }
    return $rt;
}
#slurp()
#decode_json();
