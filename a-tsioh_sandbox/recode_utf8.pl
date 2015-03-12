use Encode qw(decode encode);

while(<>){
    print encode('UTF-8', decode('CP950', $_));
}

