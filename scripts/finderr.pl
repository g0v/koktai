
print "­ì½Z®æ¦¡±`¥Ç¿ù»~ÀË¬dµ{¦¡    2000 ¦~ 2 ¤ë 12 ¤éª©\n\n";

$start = -1;
while (($start < 0) || ($start > 446)) {
        print "½Ð¿é¤J°_©lÀÉ®×½s¸¹ (0 ~ 446)¡G";
        $start = <STDIN>;
        chop ($start);
}

$stop = -1;
while (($stop < $start) || ($stop > 446)) {
        print "½Ð¿é¤Jµ²§ôÀÉ®×½s¸¹ ($start ~ 446)¡G";
        $stop = <STDIN>;
        chop ($stop);
}

open (OUTPUT, ">finderr.out") || die "Cannot open output file finderr.out\n";
print "\nÀË¬d¨ìªº¿ù»~±N·|¼g¦b finderr.out ³o­ÓÀÉ®×¤¤¡C\nÀË¬d¤¤¡A½Ðµy­Ô...\n";
$oldfh = select (OUTPUT);

for ($i = $start; $i <= $stop; $i++) {
        $fn = $i;
        $fn = "0" . $fn if $i < 100;
        $fn = "0" . $fn if $i < 10;
        $fn = "c:\\dic\\" . $fn . ".dic";

        open (FILE, $fn) || die "Cannot open file $fn\n";

        while (<FILE>) {
                chop;
                if ($_ eq "~fm3;¡@") {
                        $_ = <FILE>;
                        chop;
                        if ($_ ne "") {
                                print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¡A¬°±j­¢ªÅ¦æ(~fm3;¡@)ªº«á¤@¦æ¡AÀ³¬°ªÅ¦æ¡A½ÐÀË¬d¡I\n";
                        }
                }
                if (/^~bb2;¡i/) {
                        if ($last ne "") {
                                print "¦b $fn ÀÉ®×ªº²Ä ".($.-1)." ¦æ¡A¬°µü±ø«e¤@¦æ¡AÀ³¬°ªÅ¦æ¡A½ÐÀË¬d¡I\n";
                        }
                }
                if (/t108/) {
                        if ($last ne "") {
                                print "¦b $fn ÀÉ®×ªº²Ä ".($.-1)." ¦æ¡A¬°¥ØÀY¦r«e¤@¦æ¡AÀ³¬°ªÅ¦æ¡A½ÐÀË¬d¡I\n";
                        }
                }
                $len = length;
                if ($len > 500) {
                       print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¹F¨ì $len ­Ó¦r¤¸¡A¥i¯à²£¥Í°ÝÃD¡A½ÐÀË¬d¡I\n";
                }
                $last = $_;
                if (index ($_, "(  )") > 0) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³¤p¬A¸¹§¨µÛ¨â­Ó¥b§ÎªÅ¥Õ (¦Ó«D¤@­Ó¥þ§ÎªÅ¥Õ)¡A½ÐÀË¬d¡I\n";
                }
                if (/( |¡@){5,}/) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¦³³\\¦hªÅ¥Õ¡A½ÐÀË¬d¡I\n";
                }
                s/ //g;
                if (/^(¡@)+$/) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³¿W¥ßªº¥þ§ÎªÅ¥Õ¡A½ÐÀË¬d¡I\n";
                }
                if (index ($_, "~bb2;¡i", 1) > 0) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³¥[²Êªºµü±ø°Ñ¦Ò bb2;¡i...¡jbb1;¡A½ÐÀË¬d¡I\n";
                }
                if (/~fk;..~fk;/) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³ ~fk;..~fk;¡A½ÐÀË¬d¡I\n";
                }

                $found = index ($_, "úµ");
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
                                print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³Âù±×½u úµ¡A½ÐÀË¬d¡I\n";
                        }
                        $found = index ($_, "úµ", $found+1);
                }

                if ((/^¡](°ê­µ|¥x¥Ì|´¶»Ô)\)/) ||        # ¥þ + ¥b
                    (/^ ?\((°ê­µ|¥x¥Ì|´¶»Ô)\)/)) {      # ¥b + ¥b
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³¥b§Î»P¥þ§Î¬A¸¹°t¹ï¡A½ÐÀË¬d¡I\n";
                }

                if ((substr($_, 0, 2) eq " (") &&       # ¥b§Î
                    (substr($_, 6, 2) eq "¡^")) {       # ¥þ§Î
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³¥b§Î»P¥þ§Î¬A¸¹°t¹ï¡A½ÐÀË¬d¡I (strange)\n";
                }

                if ((substr($_, 0, 1) eq "(") &&        # ¥b§Î
                    (substr($_, 5, 2) eq "¡^")) {       # ¥þ§Î
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¥X²{¦³¥b§Î»P¥þ§Î¬A¸¹°t¹ï¡A½ÐÀË¬d¡I\n";
                }

                $tilde = 0;
                $len = length ($_);
                $offset = 0;
                while ($offset < $len) {
                        $c = ord (substr ($_, $offset));
                        if ((0x81 <= $c) && ($c <= 0xFE)) {
                                $c = ord (substr ($_, $offset+1));
                                if (((0x40 <= $c) && ($c <= 0x7E)) ||
                                    ((0xA1 <= $c) && ($c <= 0xFE))) {
                                        $offset += 2;
                                        next;
                                } else {
                                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ²Ä ".($offset+1)." ¦r¤¸¦³«D BIG-5 ½X½d³ò¦r¤¸¡A½ÐÀË¬d¡I\n";
                                }
                        }
                        if ($c == ord('~')) { $tilde++; }
                        if ($c == ord(';')) { $tilde--; }
                        $offset++;
                }
                if ($tilde != 0) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¦³¦C¦L±±¨î²Å¸¹¤£¦¨¹ï±¡§Î¡A½ÐÀË¬d¡I\n";
                }
                if ($offset > $len) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¦³·N¥~ªº¿ù»~±¡ªpµo¥Í¡A½ÐÀË¬d¡I\n";
                }

                $fk = 0;
                $fm3 = 0;
                $offset = ($[-1);
                while (($offset = index($_, "~fk;", $offset+1)) != ($[-1)) {
                        $fk++;
                }
                $offset = ($[-1);
                while (($offset = index($_, "~fm3;", $offset+1)) != ($[-1)) {
                        $fm3++;
                }
                if (($fk != $fm3) && ($_ ne "~fm3;") && ($_ ne "~fm3;¡@")) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¦³ ~fk; ~fm3; ¤£¦¨¹ï±¡§Î¡A½ÐÀË¬d¡I\n";
                }
                if (/(\?|¡H){3,}/) {
                        print "¦b $fn ÀÉ®×ªº²Ä $. ¦æ¦³¤T­Ó¥H¤W³sÄò°Ý¸¹¡A½ÐÀË¬d¡I\n";
                }
        }

        if ($last ne "") {
                print "¦b $fn ÀÉ®×ªº³Ì«á¤@¦æ¥X²{¦³¤å¦r¡A½ÐÀË¬d¡I\n";
        }

        close (FILE);
}

select ($oldfh);
close (OUTPUT);
