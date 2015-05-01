use strict;

use Encode;




while (<>) {
    Encode::_utf8_on($_);
    s%<rt>([\x{3105}-\x{31b3}]+)(.*)</rt>%\{\{rt\|$1|$2\}\}%g;
    s%\s*\x{358}%\x{307}%g;
    s/\|\}\}/\}\}/g;
    print;


}
