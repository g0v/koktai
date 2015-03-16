/*
    xfn2gif - a program to export XFN font to GIF file.

    xfn2gif -i input_filename -o output_filename -t typeface -c Big5-code
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <dir.h>

#include "bitmap.h"
#include "convert.h"
#include "gd1.3/gd.h"
#include "tai.h"
#include "xfn.h"

void 
usage ()
{
        fputs("usage:", stderr);
	fputs("  xfn2gif -i input_filename -o output_filename -t typeface -c Big5-code", stderr);
	exit (1);
}

int
main(int argc, char *argv[]) {
	char	*input_filename = NULL;
        char	*output_filename = NULL;
        char	*typeface_str = NULL;
        unsigned char	typeface = XFN_max_id_of_typeface + 1;
	unsigned short	code = 0;

        XFN_file	*input_file = NULL;
        XFN_char	*input_char;
        FILE	*output_file;
        gdImagePtr	im_out;
        BITMAP	bitmap[2048];

        int	opt, i, white, black, x, y;

	while ((opt = getopt (argc, argv, "i:o:t:c:")) != -1)
	{
		switch (opt)
		{
		case 'i':
			input_filename = optarg;
			break;
		case 'o':
			output_filename = optarg;
			break;
		case 't':
                	typeface_str = optarg;
			typeface = typeface_TAI2XFN(
				TAI_typeface_string_to_index (optarg));
			break;
                case 'c':
                	code = (unsigned short) strtol(optarg, NULL, 16);
                        break;
		}
	}

        if (input_filename == NULL)
        	usage();
        if (output_filename == NULL)
        	usage();
        if (typeface == XFN_max_id_of_typeface+1)
        	usage();
	if (code == 0)
		usage();

	input_file = XFN_file_open (input_filename, "rb");
	XFN_file_read_header (input_file);
	XFN_file_read_index (input_file);

	for (i = 0; i < input_file->header.number_of_char; i++) {
		input_char = &input_file->at[i];

		if (input_char->typeface != typeface)
                	continue;
                if (XFN_char_get_big5_code(input_char) != code)
			continue;

		output_file = fopen(output_filename, "wb");
		im_out = gdImageCreate(input_char->size8*8, input_char->size8*8);

		XFN_load_char(input_file, input_char, bitmap, 2048);

		white = gdImageColorAllocate(im_out, 255, 255, 255);
		black = gdImageColorAllocate(im_out, 0, 0, 0);

	        for (x = 0; x < input_char->size8*8; x++) {
	                for (y = 0; y < input_char->size8*8; y++) {
                        	if (BITMAP_get_pixel(bitmap, input_char->size8*8, x, y)) {
			                gdImageSetPixel(im_out, x, y, black);
                                } else {
			                gdImageSetPixel(im_out, x, y, white);
                                }
       		        }
                }

		gdImageColorTransparent(im_out, white);
                gdImageGif(im_out, output_file);
                fclose(output_file);
		gdImageDestroy(im_out);
                break;
        }

        fclose(input_file->file);

	return 0;
}

