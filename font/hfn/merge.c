/*
   merge - a program to merge several .XFN files or CMEX User Font Files
   into one .XFN file or one CMEX User Font File

   merge -p -f format -o output_filename input_filename1 input_filename2 ...
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

#include "xfn.h"
#include "cmexuf.h"

#define	MAX_NUMBER_OF_INPUT_FILE	(16)

enum format_e
  {
    unknown,
    xfn,
    cmex
  };

typedef enum format_e format;

void 
usage ()
{
  fprintf (stderr, "merge -p -f format -o output_filename input_filename1 input_filename2 ...\n");
  exit (1);
}

int 
main (int argc, char *argv[])
{
  int number_of_input_file = 0;
  char *input_filename[MAX_NUMBER_OF_INPUT_FILE];
  XFN_file *input_xfn_file[MAX_NUMBER_OF_INPUT_FILE];
  CMEX_UFP_file *input_cmex_file[MAX_NUMBER_OF_INPUT_FILE];

  char *output_filename = NULL;
  XFN_file *output_xfn_file;
  CMEX_UFP_file *output_cmex_file;

  format file_format = unknown;
  int priority = 0;
  CMEX_typeface cmex_typeface;
  int cmex_size;
  XFN_char *source_char;

  int opt, i, j, n;

  opterr = 1;
  while ((opt = getopt (argc, argv, "pf:o:")) != -1)
    {
      switch (opt)
	{
	case 'p':
	  priority = 1;
	  break;
	case 'f':
	  if (strcmp (optarg, "cmex") == 0)
	    file_format = cmex;
	  else if (strcmp (optarg, "xfn") == 0)
	    file_format = xfn;
	  else
	    usage ();
	  break;
	case 'o':
	  output_filename = optarg;
	  break;
	case '?':
	  usage ();
	}
    }

  while (optind < argc)
    {
      if (number_of_input_file < MAX_NUMBER_OF_INPUT_FILE)
	input_filename[number_of_input_file++] = argv[optind++];
      else
	usage ();
    }

  if (file_format == unknown)
    usage ();
  if (output_filename == NULL)
    usage ();

  /* open input files */

  for (i = 0; i < number_of_input_file; i++)
    {
      if (file_format == xfn)
	{
	  input_xfn_file[i] = XFN_file_open (input_filename[i], "rb");
	  XFN_file_read_header (input_xfn_file[i]);
	  XFN_file_read_index (input_xfn_file[i]);
	  XFN_file_sort_index (input_xfn_file[i]);
	}
      else
	{
	  input_cmex_file[i] = CMEX_UFP_file_open (input_filename[i], "rb");
	  CMEX_UFP_file_read_all (input_cmex_file[i]);
	  if (i == 0)
	    {
	      cmex_typeface = CMEX_UFP_file_get_typeface (input_cmex_file[0]);
	      cmex_size = input_cmex_file[0]->header.char_width;
	    }
	  else
	    {
	      if (cmex_typeface != CMEX_UFP_file_get_typeface (input_cmex_file[i]))
		fprintf (stderr, "input file typeface inconsistant!\n");
	      if (cmex_size != input_cmex_file[i]->header.char_width)
		fprintf (stderr, "input file font size inconsistant!\n");
	    }
	  CMEX_UFP_file_sort (input_cmex_file[i]);
	}
    }

  /* open output file */

  if (file_format == xfn)
    output_xfn_file = XFN_file_new (output_filename);
  else
    {
      output_cmex_file = CMEX_UFP_file_new (output_filename, cmex_size);
      CMEX_UFP_file_set_typeface (output_cmex_file, cmex_typeface);
    }

  /* merge */

  if (file_format == xfn)
    {
      /* merge */

      n = 0;
      for (i = 0; i < number_of_input_file; i++)
	{
	  for (j = 0; j < input_xfn_file[i]->header.number_of_char; j++)
	    {
	      output_xfn_file->at[n] = input_xfn_file[i]->at[j];
	      n++;
	    }
	}
      output_xfn_file->header.number_of_char = n;
      output_xfn_file->header.number_of_index = n / XFN_number_of_char_per_index + 1;

      /* check for duplicate */

      XFN_file_sort_index (output_xfn_file);
      for (i = 0; i < output_xfn_file->header.number_of_char - 1; i++)
	{
	  if (XFN_char_compare (&output_xfn_file->at[i], &output_xfn_file->at[i + 1]) == 0)
	    {
	      fprintf (stderr, "Duplicate char found... Code: %2X%2X Typeface: %s  :-(\n",
                   output_xfn_file->at[i].code_highbyte,
                   output_xfn_file->at[i].code_lowbyte,
                   XFN_typeface_index_to_chinese_string (output_xfn_file->at[i].typeface));

         for (j = 0; j < number_of_input_file; j++)
         {
           source_char = XFN_char_in_file (&output_xfn_file->at[i], input_xfn_file[j]);
           if (source_char != NULL)
           {
             fprintf( stderr, "It can be found in file #%d", j);
             break;
           }
         }

         for (j++; j < number_of_input_file; j++)
         {
           source_char = XFN_char_in_file (&output_xfn_file->at[i+1], input_xfn_file[j]);
           if (source_char != NULL)
           {
             fprintf( stderr, " and #%d\n", j);
             break;
           }
         }

	      exit (1);
	    }
	}

      /* write back */

      XFN_file_write_header (output_xfn_file);
      XFN_file_recalculate_index (output_xfn_file);
      XFN_file_write_index (output_xfn_file);

      for (i = 0; i < output_xfn_file->header.number_of_char; i++)
	{
	  for (j = 0; j < number_of_input_file; j++)
	    {
	      source_char = XFN_char_in_file (&output_xfn_file->at[i], input_xfn_file[j]);
	      if (source_char != NULL)
		{
		  XFN_copy_char (input_xfn_file[j], output_xfn_file, *source_char);
		  break;
		}
	    }
	}

      fclose (output_xfn_file->file);

    }
  else
    {
      /* merge */

      n = 0;
      for (i = 0; i < number_of_input_file; i++)
	{
	  for (j = 0; j < input_cmex_file[i]->header.char_count; j++)
	    {
	      output_cmex_file->at[n] = input_cmex_file[i]->at[j];
	      n++;
	    }
	}
      output_cmex_file->header.char_count = n;

      /* check for duplicate */

      CMEX_UFP_file_sort (output_cmex_file);
      for (i = 0; i < output_cmex_file->header.char_count - 1; i++)
	{
	  if (CMEX_UFP_char_compare (&output_cmex_file->at[i], &output_cmex_file->at[i + 1]) == 0)
	    {
	      if (priority == 0)
		{
		  fprintf (stderr, "Duplicate char found... :-(\n");
		  exit (1);
		}
	      else
		{
		  for (j = 0; j < number_of_input_file; j++)
		    {
		      if (CMEX_UFP_char_in_file (&output_cmex_file->at[i], input_cmex_file[j]))
			{
			  CMEX_UFP_file_delete_char (output_cmex_file, i + 1);
			  i--;
			  break;
			};
		      if (CMEX_UFP_char_in_file (&output_cmex_file->at[i + 1], input_cmex_file[j]))
			{
			  CMEX_UFP_file_delete_char (output_cmex_file, i);
			  i--;
			  break;
			};
		    }
		}
	    }
	}

      /* write back */

      CMEX_UFP_file_write_all (output_cmex_file);
      fclose (output_cmex_file->file);
    }

  return 0;
}
