/*
   xfncut - a program to cut a specified portion of an .XFN file

   xfncut -o output_filename input_filename begin_code end_code
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <assert.h>

#include "xfn.h"

void 
usage ()
{
  fprintf (stderr, "xfncut -o output_filename input_filename begin_code end_code\n");
  exit (1);
}

int 
main (int argc, char *argv[])
{
  char *input_filename;
  XFN_file *input_xfn_file;
  unsigned short input_code;

  char *output_filename = NULL;
  XFN_file *output_xfn_file;
  
  char *begin_code_str, *end_code_str;
  unsigned short begin_code, end_code;

  XFN_char *source_char;

  int opt, i, n;

  opterr = 1;
  while ((opt = getopt (argc, argv, "o:")) != -1)
    {
      switch (opt)
	{
	case 'o':
	  output_filename = optarg;
	  break;
	case '?':
	  usage ();
	}
    }

  if (optind+2 < argc)
    {
      input_filename = argv[optind];
      begin_code_str = argv[optind+1];
      begin_code = strtol(begin_code_str, NULL, 16);
      end_code_str = argv[optind+2];
      end_code = strtol(end_code_str, NULL, 16);
    }      
  else
    {
      usage ();
    }

  if (output_filename == NULL)
    usage ();

  /* open input files */

  input_xfn_file = XFN_file_open (input_filename, "rb");
  XFN_file_read_header (input_xfn_file);
  XFN_file_read_index (input_xfn_file);
  XFN_file_sort_index (input_xfn_file);

  /* open output file */

  output_xfn_file = XFN_file_new (output_filename);

  /* cut */

  n = 0;
  for (i = 0; i < input_xfn_file->header.number_of_char; i++)
    {
      input_code = XFN_char_get_big5_code (&input_xfn_file->at[i]);
      if ((input_xfn_file->at[i].typeface == XFN_typeface_kai)
          && (input_xfn_file->at[i].size8 == (128/8))
          && (begin_code <= input_code)
          && (input_code <= end_code))
        {
	  output_xfn_file->at[n] = input_xfn_file->at[i];
	  n++;
	}
    }
  output_xfn_file->header.number_of_char = n;
  output_xfn_file->header.number_of_index = n / XFN_number_of_char_per_index + 1;

  /* write back */

  XFN_file_write_header (output_xfn_file);
  XFN_file_recalculate_index (output_xfn_file);
  XFN_file_write_index (output_xfn_file);

  for (i = 0; i < output_xfn_file->header.number_of_char; i++)
    {
      source_char = XFN_char_in_file (&output_xfn_file->at[i], input_xfn_file);
      assert(source_char != NULL);
      XFN_copy_char (input_xfn_file, output_xfn_file, *source_char);
    }

  fclose (output_xfn_file->file);

  return 0;
}
