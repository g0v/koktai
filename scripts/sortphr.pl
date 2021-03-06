
print "詞條順序錯誤檢查程式    2000 年元月 3 日版\n\n";

$taiin = "\\tai\\src\\xfn\\usrfont.lst";
$taichar = "\\tai\\lib\\ufinfo";

sub IsBig5 {
        my ($hi, $lo) = (ord($_[0]), ord(substr($_[0], 1)));
        my $code = $hi * 256 + $lo;
        
        if ((0x81 <= $hi && $hi <= 0xFE) &&
            ((0x40 <= $lo && $lo <= 0x7E) || (0xA1 <= $lo && $lo <= 0xFE))) {
                return 1;
        } else {
                return 0;
        }
}

sub IsBig5Std {
        my ($hi, $lo) = (ord($_[0]), ord(substr($_[0], 1)));
        my $code = $hi * 256 + $lo;
        
        if ((0xA4 <= $hi && $hi <= 0xF9) && 
            ((0x40 <= $lo && $lo <= 0x7E) || (0xA1 <= $lo && $lo <= 0xFE))) {
                if (0xC6A1 <= $code && $code <= 0xC8FE) { return 0; }
                return 1;
        } else {
                return 0;
        }
}

sub IsTaiIn {
        if (defined $taiin{$_[0]}) {
                return 1;
        } else {
                return 0;
        }
}

sub IsTaiChar {
        my $char = substr($_[0], 0, 2);

        if (defined $taichar{$char}) {
                return 1;
        } else {
                return 0;
        }
}

sub read_taiin {
        open(TAIIN, $taiin) || die "無法開啟方音造字定義檔 usrfont.lst\n";
        while (<TAIIN>) {
                chop;
                next if (/^\./);
                ($typeface, $char, $spellkey) = split;
                $taiin{"$char:$typeface"} = $spellkey;
        }
        close TAIIN;
}

sub read_taichar {
        my $i;

        open(TAICHAR, $taichar) || die "無法開啟漢字造字定義檔 ufinfo\n";
        for ($i = 0; $i < 5; $i++) { <TAICHAR>; }
        while (<TAICHAR>) {
                if (scalar(split) == 6) {
                        $taichar{substr($_, 0, 2)} = 1;
                }
        }
        close TAICHAR;
}

$s2i{"1"} = 37;
$s2i{"q"} = 36;
$s2i{"a"} = 35;
$s2i{"z"} = 34;
$s2i{"2"} = 33;
$s2i{"w"} = 32;
$s2i{"s"} = 31;
$s2i{"x"} = 30;
$s2i{"e"} = 29;
$s2i{"d"} = 28;
$s2i{"c"} = 27;
$s2i{"r"} = 26;
$s2i{"f"} = 25;
$s2i{"v"} = 24;
$s2i{"5"} = 23;
$s2i{"t"} = 22;
$s2i{"g"} = 21;
$s2i{"b"} = 20;
$s2i{"y"} = 19;
$s2i{"h"} = 18;
$s2i{"n"} = 17;
$s2i{"8"} = 16;
$s2i{"i"} = 15;
$s2i{"k"} = 14;
$s2i{","} = 13;
$s2i{"9"} = 12;
$s2i{"o"} = 11;
$s2i{"l"} = 10;
$s2i{"."} =  9;
$s2i{"0"} =  8;
$s2i{"p"} =  7;
$s2i{";"} =  6;
$s2i{"/"} =  5;
$s2i{"-"} =  4;
$s2i{"u"} =  3;
$s2i{"j"} =  2;
$s2i{"m"} =  1;

sub Spell2Index {
        my $arg = $_[0];
        my $spell = substr($arg, 0, rindex($arg, ","));
        my $tone = substr($arg, rindex($arg, ",")+1);
        my $len_spell = length($spell);
        my $i;
        my $index = 0;
        my $s;

        if ($len_spell > 3) { return -1; }
        for ($i = 1; $i <= $len_spell; $i++) {
                $s = substr($spell, $i-1, 1);
                if (defined $s2i{$s}) {
                        $index = $index * 100 + $s2i{$s};
                } else {
                        return -1;
                }
        }
        for ($i = $len_spell+1; $i <= 4; $i++) {
                $index = $index * 100 + 99;
        }
        $index += $tone;
        return $index;
}

$start = -1;
while (($start < 0) || ($start > 446)) {
        print "請輸入起始檔案編號 (0 ~ 446)：";
        $start = <STDIN>;
        chop ($start);
}

$stop = -1;
while (($stop < $start) || ($stop > 446)) {
        print "請輸入結束檔案編號 ($start ~ 446)：";
        $stop = <STDIN>;
        chop ($stop);
}

open (OUTPUT, ">sortphr.out") || die "Cannot open output file sortphr.out\n";
print "\n詞條順序錯誤將會寫在 sortphr.out 這個檔案中。\n檢查順序中，請稍候...\n";
$oldfh = select (OUTPUT);

read_taiin;
read_taichar;

for ($i = $start; $i <= $stop; $i++) {
        $fn = $i;
        $fn = "0" . $fn if $i < 100;
        $fn = "0" . $fn if $i < 10;
        $fn = "c:\\dic\\" . $fn . ".dic";

        open (FILE, $fn) || die "Cannot open file $fn\n";

        while (<FILE>) {
                chop;
                s/ //g;

                if (/t108/) {
                        $key_char = "";
                        $last_class = 0;        # 詞條字數

                        unless (/^ ?~t108(fm3)?bb2r2(;| ) ?([^ ]+) ?~(t|T)72bb1r1;/) {
                                print "在 $fn 檔案的第 $. 行，目頭字排版指令錯誤\t$_\n";
                        }

                        $tmp = $3;
                        $offset = 0;
                        $len = length($tmp);

                        while ($offset < $len) {
                                $s = substr($tmp, $offset);
                                if ( IsBig5Std($s)
                                  || ($tmp =~ /^(○|∟|�揉�掤ㄅ|ㄊ|ㄎ|ㄐ|ㄑ|ㄒ|ㄖ|ㄘ|ㄙ|ㄩ|ㄛ|ㄞ|ㄟ|ㄠ|ㄢ|�~|�S|�p)/)
                                  || (substr($tmp, 0, 2) eq "ㄍ") ) {
                                        $key_char = substr($s, 0, 2);
                                        goto next_line;
                                } elsif ($s =~ /^~fk;(..)~fm3;/) {
                                        if (IsTaiChar($1)) {
                                                $key_char = substr($s, 0, 11);
                                                goto next_line;
                                        } else {
                                                $offset += 11;
                                        }
                                } elsif ($s =~ /^\(/) {
                                        $offset += index($s, ")") + 1;
                                } elsif (IsBig5($s)) {
                                        $offset += 2;
                                } else {
                                        $offset += 1;
                                }
                        }
                        print "在 $fn 檔案的第 $. 行，找不到目頭字！\n";
                }

                next unless /^~bb2;【/;

                $phrase = substr($_, 7, index($_, "】")-7);
                $num_char = 0;
                undef @char;
                undef @spell;
                print "$fn\t$.\t$phrase\n";

                $offset = 0;
                $len = length ($phrase);

                while ($offset < $len) {
                        $s = substr($phrase, $offset);
                        if (IsBig5Std($s)) {
                                $offset += 2;
                                $num_char++;
                                $char[$num_char] = substr($s, 0, 2);
                                $spell[$num_char] = "";
                        } elsif (IsTaiIn(substr($s, 0, 2).":m3")) {
                                $offset += 2;
                                if (not defined $spell[$num_char]) {
                                        $spell[$num_char] = $taiin{substr($s, 0, 2).":m3"};
                                }
                        } elsif ($s =~ /^~fk;(..)~fm3;/) {
                                if (IsTaiChar($1)) {
                                        $offset += 11;
                                        $num_char++;
                                        $char[$num_char] = substr($s, 0, 11);
                                        $spell[$num_char] = "";
                                } elsif (IsTaiIn($1.":k")) {
                                        $offset += 11;
                                        if (not defined $spell[$num_char]) {
                                                $spell[$num_char] = $taiin{substr($s, 4, 2).":k"};
                                        }
                                } else {
                                        $offset += 11;
                                        print "在 $fn 檔案的第 $. 行，詞條中發現非漢字亦非拼音的楷書字元 $1\n";
                                }
                        } elsif ($s =~ /^\(/) {
                                if (index($s, ")") == $[-1) {
                                        print "在 $fn 檔案的第 $. 行，詞條中發現半形括號不成對現象\n";
                                        $offset++;
                                } else {
                                        $offset += index($s, ")") + 1;
                                }
                        } elsif (IsBig5($s)) {
                                $offset += 2;
                                print "在 $fn 檔案的第 $. 行，詞條中發現非標準字亦非造字的字元", substr($s, 0, 2), "\n";
                        } else {
                                $offset += 1;
                                print "在 $fn 檔案的第 $. 行，詞條中發現非標準字亦非造字的字元", substr($s, 0, 1), "\n";
                        }
                }

                $class = 0;
                for ($j = 1; $j < $num_char; $j++) { $class += $j; }
                for ($j = 1; $j <= $num_char; $j++) {
                        if ($char[$j] eq $key_char) { $class += $j; last; }
                }
                if ($j > $num_char) {
                        print "在 $fn 檔案的第 $. 行，詞條【$phrase】中沒有發現目頭字「$key_char」\n";
                }

                if ($class > $last_class) {
                        # normal case 1
                        $last_class = $class;
                        @last_char = @char;
                        @last_spell = @spell;
                } elsif ($class == $last_class) {
                        for ($j = 1; $j <= $num_char; $j++) {
                                if (not defined $spell[$j]) {
                                        # error case 4
                                        print "在 $fn 檔案的第 $. 行，詞條【$phrase】無法排序！\n";
                                        last;
                                }
                                $index = Spell2Index($spell[$j]);
                                $last_index = Spell2Index($last_spell[$j]);

                                if ($index == -1) {
                                        # errro case 3
                                        print "在 $fn 檔案的第 $. 行，詞條【$phrase】無法排序！\n";
                                        last;
                                }

                                if ($index < $last_index) {
                                        # normal case 2
                                        $last_class = $class;
                                        @last_char = @char;
                                        @last_spell = @spell;
                                        last;
                                }
                                if ($index > $last_index) {
                                        # error case 2
                                        print "在 $fn 檔案的第 $. 行，詞條【$phrase】出現順序錯誤！\n";
                                        last;
                                }
                        }
                } else {
                        # $class < $last_class
                        # error case 1
                        print "在 $fn 檔案的第 $. 行，詞條【$phrase】出現順序錯誤！\n";
                }

                #print "$phrase\t$class\n";
next_line:
        }

        close (FILE);
}

select ($oldfh);
close (OUTPUT);
