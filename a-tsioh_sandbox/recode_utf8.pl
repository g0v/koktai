use Encode qw(decode encode);

while(<>){
    print encode('UTF-8', remap_pua(decode('CP950', $_)));
}

sub remap_pua {
    # Take BMP PUAs and make them "go astral" using original Big5 codepoints
    my $str = shift;
    $str =~ s{(^ +)?(~[A-Z][A-Z0-9]+;)}{\L$2\E}mg;
    $str =~ s!([\x{E000}-\x{F8FF}])!
    chr(0xF0000 + hex(join '', map sprintf("%02X", ord $_), split //, encode('CP950' => $1)))
    #    "&#xF".(join '', map sprintf("%02x", ord $_), split //, encode('CP950' => $1)).";"
    !egx;
    return $str;
}
