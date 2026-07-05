/*
   patch1 - a program to patch ETP.XFN in order to fix problem found
            in Feb, 1999 with unknown reason.

   patch1 -o output_filename input_filename
 */

#include <stdio.h>
#include <unistd.h>
#include <assert.h>

#include "xfn.h"
#include "convert.h"

#define TRUE 1
#define FALSE 0

void 
usage ()
{
  fprintf (stderr, "patch1 -o output_filename input_filename");
  exit (1);
}

int
main (int argc, char *argv[])
{
  char *input_filename = NULL;
  XFN_file *input_xfn_file;
  XFN_char *input_char;
  unsigned int input_code;

  char *output_filename = NULL;
  XFN_file *output_xfn_file;
  XFN_char *output_char;
 
  unsigned int err_1, err_2;	/* error mark */

  int opt, i, offset, n, c, n2, c2;
  unsigned char h, l;

  /* parse options from the command line */
  
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
  if (optind < argc)
    input_filename = argv[optind];

  if (input_filename == NULL)
    usage ();
  if (output_filename == NULL)
    usage ();

  /* open input and output files */
  
  input_xfn_file = XFN_file_open (input_filename, "rb");
  XFN_file_read_header (input_xfn_file);
  XFN_file_read_index (input_xfn_file);
  
  output_xfn_file = XFN_file_new (output_filename);

  /* patch */

  /* init error mark */

  err_1 = 0x9CF9;
  err_2 = 0xFAC3;

  /* copy and correct index */

  printf ("Processing index\n");

  offset = 0;
  n = 0; /* count number of output char */
  c = 0; /* count number of moved char */
  for (i = 0; i < input_xfn_file->header.number_of_char; i++)
    {
      input_char = &(input_xfn_file->at[i]);
      input_code = XFN_char_get_big5_code (input_char);

      /* 
      printf ("Typeface = %s, Size = %d, BIG5 Code = %4X, Serial Code = %4X\n", 
              XFN_typeface_index_to_chinese_string (input_char->typeface), input_char->size8*8,
              input_code, XFN_char_get_serial_code (input_char));
       */
      
      if ((input_char->typeface == XFN_typeface_kai) && (input_char->size8 == (128/8)))
        {
          if (input_code == err_1)
            {
	      offset = -1;
	      printf ("Discarding %4X\n", input_code);
	      goto next1;
	    }
	  if (input_code == err_2)
	    {
	      offset = -2;
      	      printf ("Discarding %4X\n", input_code);
      	      goto next1;
	    }
        }
        
	output_xfn_file->at[n] = input_xfn_file->at[i+offset];
	        
        if (offset != 0) 
          {
	    c++;
            output_char = &(output_xfn_file->at[n]);
	    printf ("Moving %4X to %2X%2X (count = %d)\n", input_code,
		    output_char->code_highbyte, output_char->code_lowbyte, c);
	  }

        n++;	        
next1:
    }
    
  /* write back header and index */
    
  assert (n == (input_xfn_file->header.number_of_char - 2));
  output_xfn_file->header.number_of_char = n;
  output_xfn_file->header.number_of_index = n / XFN_number_of_char_per_index + 1;

  XFN_file_write_header (output_xfn_file);
  XFN_file_recalculate_index (output_xfn_file);
  XFN_file_write_index (output_xfn_file);
      
  /* write back bitmap with correction */

  printf ("Processing bitmap\n");
      
  offset = 0;
  n2 = 0;
  c2 = 0;
  for (i = 0; i < input_xfn_file->header.number_of_char; i++)
    {
      input_char = &(input_xfn_file->at[i]);
      input_code = XFN_char_get_big5_code (input_char);
      
      if ((input_char->typeface == XFN_typeface_kai) && (input_char->size8 == (128/8)))
        {
          if (input_code == err_1)
            {
	      offset = -1;
	      printf ("Discarding %4X\n", input_code);
	      goto next2;
	    }
	  if (input_code == err_2)
	    {
	      offset = -2;
      	      printf ("Discarding %4X\n", input_code);
      	      goto next2;
	    }
        }

	XFN_copy_char (input_xfn_file, output_xfn_file, *input_char);

        if (offset != 0) 
          {
            c2++;
            output_char = &(output_xfn_file->at[n2]);
	    printf ("Moving %4X to %2X%2X (count = %d)\n", input_code,
		    output_char->code_highbyte, output_char->code_lowbyte, c2);
          }
	
        n2++;
next2:
    }
    
  assert((n == n2) && (c == c2));

  return 0;
}
