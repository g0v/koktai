use strict;

use Encode;




while (<>) {
    s%<rt>([\x{3105}-\x{31b3}]+)(.?.?.?)</rt>%\{\{rt\|$1|$2\}\}%g;
    s/\|\}\}/\}\}/g;
    print;


}
