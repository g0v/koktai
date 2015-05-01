
print "輕聲轉換程式    2000 年元月 3 日版\n\n";

open (NEUTRAL, "neutral.lst") || die "Cannot open neutral-tone list file neutral.lst\n";
while (<NEUTRAL>) {
        ($orig, $new) = split;
        $neutral{$orig} = $new;
}
close (NEUTRAL);
$num_neutral = keys %neutral;
print "由 neutral.lst 中取得 $num_neutral 組輕聲轉換\n";

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

$yes = 0;
while ($yes == 0) {
        print "你確定要轉換 $start 檔案到 $stop 檔案嗎？ (y/n) ";
        $ch = <STDIN>;
        chop ($ch);
        if ($ch =~ /^(y|Y)$/) {
                $yes = 1;
        } elsif ($ch =~ /^(n|N)$/) {
                die;
        }
}

open (OUTPUT, ">neutral.out") || die "Cannot open output file neutral.out\n";
print "\n直接在原稿上轉換，並且將過程記錄在 neutral.out 這個檔案中。\n轉換中，請稍候...\n";
$oldfh = select (OUTPUT);

$false = 0;
for ($i = $start; $i <= $stop; $i++) {
        $fn = $i;
        $fn = "0" . $fn if $i < 100;
        $fn = "0" . $fn if $i < 10;
        $fn_new = "c:\\dic\\" . $fn . ".new";
        $fn = "c:\\dic\\" . $fn . ".dic";

        open (FILE, $fn) || die "Cannot open input file $fn\n";
        open (FILE_NEW, ">$fn_new") || die "Cannot open output file $fn_new\n";

        while (<FILE>) {
                foreach $orig (keys %neutral) {
                        $found = index ($_, $orig);
                        while ($found != -1) {
                                $offset = 0;
                                while ($offset < $found) {
                                        $c = ord (substr ($_, $offset));
                                        if ((0x81 <= $c) && ($c <= 0xFE)) {
                                                $offset += 2;
                                        } else {
                                                $offset++;
                                        }
                                }
                                if ($offset == $found) {
                                        print "$fn 檔案\t第 $. 行\n$_";
                                        $_ = substr($_, 0, $found) . $neutral{$orig}
                                           . substr($_, $found+length($orig));
                                        print "$_";
                                        print " "x$found . "^"x(length($neutral{$orig})) . "\n";
                                } else {
                                        $false++;
                                }
                                $found = index ($_, $orig, $found+1);
                        }
                }
                print FILE_NEW $_;
        }

        close (FILE);
        close (FILE_NEW);
        unlink ($fn);
        rename ($fn_new, $fn);
}

print "過程中共發生 $false 次假警報\n";
select ($oldfh);
close (OUTPUT);
