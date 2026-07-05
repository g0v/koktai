/*
   de-base - a program to decode base8.raw and base32.raw
             into several files in base8\ and base32\ directories

   de-base.exe (no argument)
 */

#include <stdio.h>
#include <stdlib.h>
#include <conio.h>
#include <dir.h>

const char str_0[] = "\xA1\xBC";
const char str_1[] = "\xA1\xBD";

void decode(char *base, int size) {
	FILE	*in, *out;
        char	in_fn[MAXPATH], out_fn[MAXPATH];
	int	i, row, j, k, b;

	sprintf(in_fn, "%s.raw", base);
	in = fopen(in_fn, "rb");
        if (in == NULL) {
        	perror(in_fn);
                exit(1);
        }
	for (i = 0; i < 82; i++) {
           	sprintf(out_fn, "%s\\%s.%02d", base, base, i);
		out = fopen(out_fn, "wt");
                if (out == NULL) {
                  	perror(out_fn);
                        exit(1);
                }
                for (row = 0; row < size; row++) {
		   	for (j = 0; j < size/8; j++) {
	                   	b = fgetc(in);
       			        for (k = 0; k < 8; k++) {
       		                    	if (b & 0x0080) {
                        	          	fputs(str_1, out);
                               		} else {
                        			fputs(str_0, out);
	                        	}
        	                	b <<= 1;
                	        }
			}
               		fputc('\n', out);
                }
        	fclose(out);
	}
	fclose(in);
}

void clear(char *base) {
	struct ffblk	f;
	char	fn[MAXPATH];
	int	i;
	static int	firsttime = 1;

	for (i = 0; i < 82; i++) {
           	sprintf(fn, "%s\\%s.%02d", base, base, i);
		if (findfirst(fn, &f, 0) == 0) {
		  	/* a match is found */
			if (firsttime) {
			  	puts("This program will remove all files in both base8\\ and base32\\ directories");
				puts("before decoding base8.raw and base32.raw. Please make sure all files in those");
				puts("directories can be removed.");
				puts("\nPress [Enter] to continue or any other key to stop...");
				if (getch() != '\r') {
					exit(1);
				}
				firsttime = 0;
			}
                	remove(fn);
		};
	}
}

int main() {
	clear("base8");
	clear("base32");
	decode("base8", 8);
	decode("base32", 32);
	return 0;
}

