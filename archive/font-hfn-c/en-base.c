/*
   en-base - a program to encode basic symbols in base8\ and base32\
             directories into base8.raw and base32.raw

   en-base.exe (no argument)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dir.h>

const char str_0[] = "\xA1\xBC";
const char str_1[] = "\xA1\xBD";

void encode(char *base, int size) {
       	FILE	*in, *out;
        char	in_fn[MAXPATH], out_fn[MAXPATH], buf[256];
	int	i, row, j, k, b;

	sprintf(out_fn, "%s.new", base);
	out = fopen(out_fn, "wb");
        if (out == NULL) {
        	perror(out_fn);
                exit(1);
        }
	for (i = 0; i < 82; i++) {
           	sprintf(in_fn, "%s\\%s.%02d", base, base, i);
		in = fopen(in_fn, "rt");
                if (in == NULL) {
                  	perror(in_fn);
                        exit(1);
                }
		for (row = 0; row < size; row++) {
                	fgets(buf, 256, in);
                        if (strlen(buf) != size*2+1) {
                        	fprintf(stderr, "%s: length of line %d is incorrect.\n", in_fn, row+1);
                                exit(2);
                        }
                        for (j = 0, b = 0; j < size/8; j++) {
                        	for (k = 0; k < 8; k++) {
                                	if (strncmp(buf+(j*8+k)*2, str_0, 2) == 0) {
                                        	b = b << 1;
                                        } else if (strncmp(buf+(j*8+k)*2, str_1, 2) == 0) {
                                        	b = (b << 1) | 1;
                                        } else {
	                                        fprintf(stderr, "%s: line %d col %d is incorrect.\n", in_fn, row+1, (j*8+k)*2+1);
						exit(2);
                                        }
                                }
                                fputc(b, out);
                        }
                }
                fclose(in);
	}
        fclose(out);
}

void clear(char *base) {
	char	fn[MAXPATH];
	int	i;

	for (i = 0; i < 82; i++) {
           	sprintf(fn, "%s\\%s.%02d", base, base, i);
               	remove(fn);
	}
}

int main() {
	encode("base8", 8);
        encode("base32", 32);
        remove("base8.raw");
        rename("base8.new", "base8.raw");
        remove("base32.raw");
        rename("base32.new", "base32.raw");
        clear("base8");
        clear("base32");
	return 0;
};
