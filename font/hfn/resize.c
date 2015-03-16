/*
   resize - a program to resize big font in .XFN file
   to 24x24 small font in CMEX user font file.

   resize -t typeface -i input_filename -o output_filename
 */

#define	NDEBUG

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

/* #include <grx20.h> */

#include "tai.h"
#include "xfn.h"
#include "cmexuf.h"
#include "bitmap.h"
#include "convert.h"

#define	OUTPUT_SIZE	(24)

#define	BUFFER_SIZE	(2048)

void 
usage ()
{
  fprintf (stderr,
	"usage: resize -t typeface -i input_filename -o output_filename\n");
  exit (1);
}

int 
main (int argc, char *argv[])
{
  char *input_filename = NULL;
  XFN_file *input_file;
  XFN_char *input_char;

  char *output_filename = NULL;
  CMEX_UFP_file *output_file;
  unsigned char output_highbyte, output_lowbyte;

  TAI_typeface resize_typeface = TAI_typeface_kai;

  int opt, i;
  char input_buffer[BUFFER_SIZE], output_buffer[BUFFER_SIZE];

  while ((opt = getopt (argc, argv, "t:i:o:")) != -1)
    {
      switch (opt)
	{
	case 't':
	  resize_typeface = TAI_typeface_string_to_index (optarg);
	  break;
	case 'i':
	  input_filename = optarg;
	  break;
	case 'o':
	  output_filename = optarg;
	  break;
	}
    }

  if (input_filename == NULL)
    usage ();
  if (output_filename == NULL)
    usage ();

  input_file = XFN_file_open (input_filename, "rb");
  XFN_file_read_header (input_file);
  XFN_file_read_index (input_file);

  output_file = CMEX_UFP_file_new (output_filename, OUTPUT_SIZE);
  CMEX_UFP_file_set_typeface (output_file, typeface_TAI2CMEX (resize_typeface));
/*
   GrSetMode(GR_default_graphics);
 */
  for (i = 0; i < input_file->header.number_of_char; i++)
    {

      printf ("%d / %d\n", i, input_file->header.number_of_char);
      input_char = &input_file->at[i];

      if (typeface_XFN2TAI (input_char->typeface) == resize_typeface)
	{

	  XFN_load_char (input_file, input_char, input_buffer, sizeof (input_buffer));

	  BITMAP_resize (output_buffer, OUTPUT_SIZE, OUTPUT_SIZE, sizeof (output_buffer),
		input_buffer, input_char->size8 * 8, input_char->size8 * 8);
/*
   GrClearScreen(GrBlack());
   BITMAP_display(output_buffer, OUTPUT_SIZE, OUTPUT_SIZE);
 */
	  charset_BIG52Serial (&output_highbyte, &output_lowbyte, input_char->code_highbyte, input_char->code_lowbyte);

	  CMEX_UFP_file_add_char (output_file, output_highbyte, output_lowbyte, output_buffer);
	}
    }

  CMEX_UFP_file_write_all (output_file);

  fclose (output_file->file);

  return 0;
}
