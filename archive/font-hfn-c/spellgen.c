/*
   spellgen - a program to generate spellings
   in 16x15, 24x24 CMEX user font file or 96x96 .XFN file

   spellgen -s size [-t typeface] [-i input_filename] -o output_filename
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <dos.h>

/* #include <grx20.h> */

#include "tai.h"
#include "xfn.h"
#include "cmexuf.h"
#include "raw.h"
#include "bitmap.h"
#include "convert.h"

#define	LINE_BUFFER	(512)

#define	BUFFER_SIZE	(2048)

	/* for 1-symbol spellings
	   1st symbol offset_width,
	   1st symbol offset_height,
	   0,
	   0,
	   0,
	   0,
	   class a tone symbol offset_width,
	   class a tone symbol offset_height,
	   class b tone symbol offset_width,
	   class b tone symbol offset_height,
	   for 2-symbol spellings
	   1st symbol offset_width,
	   1st symbol offset_height,
	   2nd symbol offset_width,
	   2nd symbol offset_height,
	   0,
	   0,
	   class a tone symbol offset_width,
	   class a tone symbol offset_height,
	   class b tone symbol offset_width,
	   class b tone symbol offset_height,
	   for 3-symbol spellings
	   1st symbol offset_width,
	   1st symbol offset_height,
	   2nd symbol offset_width,
	   2nd symbol offset_height,
	   3rd symbol offset_width,
	   3rd symbol offset_height,
	   class a tone symbol offset_width,
	   class a tone symbol offset_height,
	   class b tone symbol offset_width,
	   class b tone symbol offset_height
	 */

struct offset_pair_s
  {
    int width, height;
  };

typedef struct offset_pair_s offset_pair;

typedef offset_pair offset_set[5];

typedef offset_set offset_rule[3];

offset_rule offset_rule_16 =
{
  {
    {0, 3},
    {0, 0},
    {0, 0},
    {8, 3},
    {8, 7}},
  {
    {0, 0},
    {0, 7},
    {0, 0},
    {8, 3},
    {8, 7}},
  {
    {0, 0},
    {0, 7},
    {8, 7},
    {8, 0},
    {8, 0}}};

offset_rule offset_rule_24 =
{
  {
    {2, 8},
    {0, 0},
    {0, 0},
    {11, 4},
    {11, 8}},
  {
    {2, 4},
    {2, 13},
    {0, 0},
    {11, 8},
    {11, 13}},
  {
    {2, 1},
    {2, 8},
    {2, 16},
    {11, 12},
    {11, 16}}};

offset_rule offset_rule_96 =
{
  {
    {9, 32},
    {0, 0},
    {0, 0},
    {42, 16},
    {42, 32}},
  {
    {9, 11},
    {9, 53},
    {0, 0},
    {42, 32},
    {42, 53}},
  {
    {9, 1},
    {9, 32},
    {9, 63},
    {42, 48},
    {42, 63}}};

void
usage ()
{
  fprintf (stderr,
	   "usage: spellgen -s size [-t typeface] [-i input_filename] -o output_filename\n");
  exit (1);
}

int
main (int argc, char *argv[])
{

  char *input_filename = "usrfont.lst";
  FILE *fontinfo_file;
  char input_buffer[LINE_BUFFER];
  TAI_fontinfo fontinfo;

  char *output_filename = NULL;
  CMEX_UFP_file *output_cmex_file;
  XFN_file *output_xfn_file;
  unsigned char output_highbyte, output_lowbyte;

  RAW_file *base_file;

  int spell_size = 0;
  TAI_typeface spell_typeface = TAI_typeface_any;

  int opt, i;
  char output_buffer[BUFFER_SIZE];
  offset_rule *spell_rule;
  int this_len, tone_rule;

/*  GrSetMode(GR_default_graphics); */

  while ((opt = getopt (argc, argv, "s:t:i:o:")) != -1)
    {
      switch (opt)
	{
	case 's':
	  spell_size = atoi (optarg);
	  break;
	case 't':
	  spell_typeface = TAI_typeface_string_to_index (optarg);
	  break;
	case 'i':
	  input_filename = optarg;
	  break;
	case 'o':
	  output_filename = optarg;
	  break;
	}
    }

  if (output_filename == NULL)
    usage ();
  if (spell_size == 0)
    usage ();

  /* open input file */

  fontinfo_file = fopen (input_filename, "rt");
  if (fontinfo_file == NULL)
    {
      perror (input_filename);
      exit (errno);
    }

  /* default typeface adjustment, open base files */

  if ((spell_size == 16) || (spell_size == 24))
    {
      if ((spell_typeface == TAI_typeface_any) ||
	  (spell_typeface == TAI_typeface_ming))
	spell_typeface = TAI_typeface_minglight;

      base_file = RAW_file_open ("base8.raw", 8, 8);
    }
  else
    {
      base_file = RAW_file_open ("base32.raw", 32, 32);
    }

  /* open output file, set spell offset rule */

  switch (spell_size)
    {
    case 16:
      if (spell_typeface == TAI_typeface_minglight)
	output_cmex_file = CMEX_UFP_file_new (output_filename, 16);
      else
	usage ();
      spell_rule = &offset_rule_16;
      break;
    case 24:
      output_cmex_file = CMEX_UFP_file_new (output_filename, 24);
      CMEX_UFP_file_set_typeface (output_cmex_file, typeface_TAI2CMEX (spell_typeface));
      spell_rule = &offset_rule_24;
      break;
    case 96:
      output_xfn_file = XFN_file_new (output_filename);
      spell_rule = &offset_rule_96;
      break;
    default:
      usage ();
    }

  /* if 96x96, build header/index first */

  if (spell_size == 96)
    {
      i = 0;
      fgets (input_buffer, sizeof (input_buffer), fontinfo_file);
      while (!feof (fontinfo_file))
	{
	  if ((input_buffer[0] == '.') || (input_buffer[0] == '\n'))
	    goto next1;

	  TAI_fontinfo_parse (&fontinfo, input_buffer);
	  if ((spell_typeface != TAI_typeface_any) &&
	      (spell_typeface != fontinfo.typeface))
	    goto next1;

	  output_xfn_file->at[i].typeface = typeface_TAI2XFN (fontinfo.typeface);
	  output_xfn_file->at[i].code_highbyte = fontinfo.code_highbyte;
	  output_xfn_file->at[i].code_lowbyte = fontinfo.code_lowbyte;
	  output_xfn_file->at[i].size8 = spell_size / 8;
	  i++;

	next1:
	  fgets (input_buffer, sizeof (input_buffer), fontinfo_file);
	}
      output_xfn_file->header.number_of_char = i;
      output_xfn_file->header.number_of_index = i / XFN_number_of_char_per_index + 1;

      XFN_file_write_header (output_xfn_file);
      XFN_file_recalculate_index (output_xfn_file);
      XFN_file_write_index (output_xfn_file);

      fseek (fontinfo_file, 0, SEEK_SET);
    }

  /* main loop */

  fgets (input_buffer, sizeof (input_buffer), fontinfo_file);
  while (!feof (fontinfo_file))
    {
      if ((input_buffer[0] == '.') || (input_buffer[0] == '\n'))
	goto next2;

      TAI_fontinfo_parse (&fontinfo, input_buffer);
      if ((spell_typeface != TAI_typeface_any) &&
	  (spell_typeface != fontinfo.typeface))
	goto next2;

      /* clean up */

      memset (output_buffer, 0, sizeof (output_buffer));

      /* build */

      this_len = strlen (fontinfo.spell);

      for (i = 0; i < this_len; i++)
	{
/*	  GrClearScreen (GrBlack()); */
	  BITMAP_copy (output_buffer, spell_size, spell_size,
		       base_file->at[TAI_spell_to_index (fontinfo.spell[i])], base_file->char_width, base_file->char_height,
		       (*spell_rule)[this_len-1][i].width, (*spell_rule)[this_len-1][i].height);
/*        BITMAP_display (output_buffer, spell_size, spell_size); */
/*        delay(2000); */
	}
      if (fontinfo.tone != 1)
	{
	  if ((fontinfo.tone <= 6) || (fontinfo.tone == 15))
	    tone_rule = 3;
	  else
	    tone_rule = 4;
	  BITMAP_copy (output_buffer, spell_size, spell_size,
		       base_file->at[fontinfo.tone + 61], base_file->char_width, base_file->char_height,
		       (*spell_rule)[this_len-1][tone_rule].width, (*spell_rule)[this_len-1][tone_rule].height);
	}

      /* output */

      if ((spell_size == 16) || (spell_size == 24))
	{
	  charset_BIG52Serial (&output_highbyte, &output_lowbyte, fontinfo.code_highbyte, fontinfo.code_lowbyte);
	  CMEX_UFP_file_add_char (output_cmex_file, output_highbyte, output_lowbyte, output_buffer);
	}
      else
	{
	  fwrite(output_buffer, spell_size * spell_size / 8, 1, output_xfn_file->file);
	}

    next2:
      fgets (input_buffer, sizeof (input_buffer), fontinfo_file);
    }

  if ((spell_size == 16) || (spell_size == 24))
    {
      CMEX_UFP_file_write_all (output_cmex_file);
      fclose (output_cmex_file->file);
    }
  else
    {
      fclose (output_xfn_file->file);
    }

  return 0;
}
