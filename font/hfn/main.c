#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <assert.h>

#include <grx20.h>

#include "tai.h"
#include "xfn.h"
#include "cmexuf.h"
#include "bitmap.h"
#include "raw.h"

int main(void) {

	RAW_file	*raw_data;
	int	i;

	raw_data = RAW_file_open("base8.raw", 8, 8);

	GrSetMode(GR_default_graphics);

	for (i = 62; i < 65; i++) {
	   	GrClearScreen(GrBlack());
	   	BITMAP_display(raw_data->at[i], 8, 8);
		delay(5000);
	}

/*
	FILE	*fontinfo_file;
	char	buf[BUFSIZ];
	TAI_fontinfo	fontinfo;

	fontinfo_file = fopen("usrfont.lst", "rt");

	fgets(buf, sizeof(buf), fontinfo_file);
	while (!feof(fontinfo_file)) {
	  	if (buf[0] != '.') {
			TAI_fontinfo_parse(&fontinfo, buf);
			printf("typeface = %d code = %2X%2X spell = %3s tone = %d",
			       fontinfo.typeface,
			       fontinfo.code_highbyte & 0x00FF,
			       fontinfo.code_lowbyte & 0x00FF,
			       fontinfo.spell,
			       fontinfo.tone);
			(void) getchar();
		}
		fgets(buf, sizeof(buf), fontinfo_file);
	}
*/
/*
	XFN_file	*test;
	BITMAP	*src, *dest;
	size_t	src_size, dest_size;
	int	i;

	clock();

	test = XFN_file_open("c:\\font\\han.xfn", "rb");
	XFN_file_read_header(test);
	XFN_file_read_index(test);

#define	DS	24

	src_size = 128 * 128 / 8;
	src = malloc(src_size);
	dest_size = DS * DS / 8;
	dest = malloc(dest_size);

	for (i = 0; i < test->header.number_of_char; i++) {

		XFN_load_char(test, test->at[i], src, src_size);

		BITMAP_resize(dest, DS, DS, dest_size, src, test->at[i].size8 * 8, test->at[i].size8 * 8);
		printf("%d\n", i);
	}

	printf("%.2f\n", (double)clock()/CLOCKS_PER_SEC);
	return 0;
*/
/*	printf("%d\n", sizeof(XFN_file)); */
	return 0;
}
