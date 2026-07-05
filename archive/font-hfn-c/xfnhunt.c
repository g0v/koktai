/*
   xfnhunt - a program to help patch HAN.XFN in order to fix problem found
             in Feb, 1999 with unknown reason.

   xfnhunt -r reference_filename input_filename
 */

#include <stdio.h>
#include <unistd.h>
#include <assert.h>

#include "xfn.h"
#include "convert.h"

#define TRUE 1
#define FALSE 0

#define BITMAP_SIZE (128*128/8)

void 
usage ()
{
  fprintf (stderr, "xfnhunt -r reference_filename input_filename");
  exit (1);
}

int
main (int argc, char *argv[])
{
  char *input_filename = NULL;
  XFN_file *input_xfn_file;
  XFN_char *input_char;
  unsigned int input_code;
  char *input_bitmap;

  char *ref_filename = NULL;
  XFN_file *ref_xfn_file;
  XFN_char *ref_char;
  char *ref_bitmap;
 
  int opt, i, bitmap_size, offset;

  /* parse options from the command line */
  
  opterr = 1;
  while ((opt = getopt (argc, argv, "r:")) != -1)
    {
      switch (opt)
	{
	case 'r':
	  ref_filename = optarg;
	  break;
	case '?':
	  usage ();
	}
    }  
  if (optind < argc)
    input_filename = argv[optind];

  if (input_filename == NULL)
    usage ();
  if (ref_filename == NULL)
    usage ();

  /* open input and output files */
  
  input_xfn_file = XFN_file_open (input_filename, "rb");
  XFN_file_read_header (input_xfn_file);
  XFN_file_read_index (input_xfn_file);
  input_bitmap = (char *) malloc (BITMAP_SIZE);
  
  ref_xfn_file = XFN_file_open (ref_filename, "rb");
  XFN_file_read_header (ref_xfn_file);
  XFN_file_read_index (ref_xfn_file);
  ref_bitmap = (char *) malloc (BITMAP_SIZE);

  /* start hunting */

  printf ("Processing index\n");

  for (i = 0; i < input_xfn_file->header.number_of_char; i++)
    {
      input_char = &(input_xfn_file->at[i]);
      input_code = XFN_char_get_big5_code (input_char);
      XFN_load_char (input_xfn_file, input_char, input_bitmap, BITMAP_SIZE);
      bitmap_size = input_char->size8 * input_char->size8 * 8;

      /* 
      printf ("Typeface = %s, Size = %d, BIG5 Code = %4X, Serial Code = %4X\n", 
              XFN_typeface_index_to_chinese_string (input_char->typeface), input_char->size8*8,
              input_code, XFN_char_get_serial_code (input_char));
       */
       
      printf ("Hunting for %4X... ", input_code);

      if ((ref_char = XFN_char_in_file (input_char, ref_xfn_file)) != NULL)
        {
          XFN_load_char (ref_xfn_file, ref_char, ref_bitmap, BITMAP_SIZE);
          if (memcmp (input_bitmap, ref_bitmap, bitmap_size) == 0)
            {
              printf ("found in place.\n");
              goto next;
            }
            
          for (offset = -1; offset >= -3; offset--)
            {
              if (ref_char+offset < ref_xfn_file->at) continue;
              
              XFN_load_char (ref_xfn_file, ref_char+offset, ref_bitmap, BITMAP_SIZE);
              if (memcmp (input_bitmap, ref_bitmap, bitmap_size) == 0)
                {
                  printf ("found at offset %d.\n", offset);
                  goto next;
                }
            }
          printf ("not found in hunt range.\n");
        }
      else
        {
          printf ("not found.\n");
        }
next:
    }
    
  return 0;
}
