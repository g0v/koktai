$definition = 'usrfont.lst';
$support = 'tsongyi.sup';
$tsongyi = 'tsongyi.box';

open (DEFINITION, $definition) || die "Can't open $definition\n";
while (<DEFINITION>) {
	chop;
	next if (/^$/ || /^\./);

	($typeface, $code, $def) = split;
	if ($typeface eq "k") {
		$code = "~fk;".$code."~fm3;";

		($spell, $tone) = $def =~ /^(.*),(\d+)$/;
		if ($tone != 15) {
			$code .= "($tone)";
		}
	}

	if (defined ($index{$def})) {
		print "Duplicate definition found: $def\n";
	} else {
		$index{$def} = $code;
	}
}
close (DEFINITION);

open (TSONGYI, ">$tsongyi");

open (SUPPORT, $support);
while (<SUPPORT>) {
	last if (/^\n$/);
	print TSONGYI $_;
}

print TSONGYI "\n";
foreach $def (sort (defseq keys (%index))) {
	($key) = $def =~ /^(.*),\d+$/;
	print TSONGYI "$key $index{$def}\n";
}
print TSONGYI "\n";

while (<SUPPORT>) {
	print TSONGYI $_;
}
close (SUPPORT);
close (TSONGYI);

sub defseq {
	($aspell, $atone) = $a =~ /^(.*),(\d+)$/;
	($bspell, $btone) = $b =~ /^(.*),(\d+)$/;
	if (($aspell cmp $bspell) == 0) {
		$atone <=> $btone;
	} else {
		$aspell cmp $bspell;
	}
}
