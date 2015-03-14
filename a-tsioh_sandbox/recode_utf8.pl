use Encode qw(decode encode);

while(<>){
    print encode('UTF-8', decode('CP950', $_));
    #print encode('UTF-8', decode('MacChineseTrad', $_));
}

