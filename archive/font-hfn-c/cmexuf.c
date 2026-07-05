#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <assert.h>

#include "cmexuf.h"

char 
CMEX_typeface_char (unsigned char typeface)
{

  switch (typeface)
    {
    case CMEX_typeface_fon_sung:
      return 'F';
    case CMEX_typeface_sung:
      /*              case CMEX_typeface_ming: *//* CMEX_typeface_ming == CMEX_typeface_sung */
      return 'M';
    case CMEX_typeface_kai:
      return 'K';
    case CMEX_typeface_yuang:
      return 'R';
    case CMEX_typeface_hei:
      return 'B';
    case CMEX_typeface_li:
      return 'L';
    case CMEX_typeface_shing:
      return 'S';
    default:
      perror ("CMEX_typeface_char()");
      exit (EINVAL);
    }
}

CMEX_UFP_file *
CMEX_UFP_file_open (const char *filename, const char *mode)
{

  CMEX_UFP_file *cmex_ufp_file;

  cmex_ufp_file = malloc (sizeof (CMEX_UFP_file));
  if (cmex_ufp_file == NULL)
    {
      perror ("CMEX_UFP_file_open()");
      exit (ENOMEM);
    }
  memset (cmex_ufp_file, 0, sizeof (CMEX_UFP_file));

  cmex_ufp_file->file = fopen (filename, mode);
  if (cmex_ufp_file->file == NULL)
    {
      perror ("CMEX_UFP_file_open()");
      exit (ENOENT);
    }

  return cmex_ufp_file;
}

CMEX_UFP_file *
CMEX_UFP_file_new (const char *filename, const int size)
{

  /* defaults to ming, 24x24 or 16x15 */

  CMEX_UFP_file *cmex_ufp_file;
  FILE *template_file;
  int number_of_items_read, return_value;

  assert ((size == 24) || (size == 16));

  cmex_ufp_file = CMEX_UFP_file_open (filename, "wb");

  if (size == 24)
    template_file = fopen (CMEX_UFP_24x24_template_file, "rb");
  else
    template_file = fopen (CMEX_UFP_16x15_template_file, "rb");
  if (template_file == NULL)
    {
      perror ("CMEX_UFP_file_new()");
      exit (ENOENT);
    }

  number_of_items_read = fread (&cmex_ufp_file->header,
			   sizeof (CMEX_UFP_file_header), 1, template_file);
  if (number_of_items_read != 1)
    {
      perror ("CMEX_UFP_file_new()");
      exit (EIO);
    }

  return_value = fclose (template_file);
  if (return_value != 0)
    {
      perror ("CMEX_UFP_file_new()");
      exit (EBADF);
    }

  return cmex_ufp_file;
}

void 
CMEX_UFP_file_read_all (CMEX_UFP_file * cmex_ufp_file)
{

  int number_of_items_read;
  unsigned i;

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  fseek (cmex_ufp_file->file, 0, SEEK_SET);

  number_of_items_read = fread (&cmex_ufp_file->header,
		     sizeof (CMEX_UFP_file_header), 1, cmex_ufp_file->file);
  if (number_of_items_read != 1)
    {
      perror ("CMEX_UFP_file_read_all()");
      exit (EIO);
    }

  for (i = 0; i < cmex_ufp_file->header.char_count; i++)
    {

      /* magic number 4 */
      number_of_items_read = fread (&cmex_ufp_file->at[i],
				    4, 1, cmex_ufp_file->file);
      if (number_of_items_read != 1)
	{
	  perror ("CMEX_UFP_file_read_all()");
	  exit (EIO);
	}

      cmex_ufp_file->at[i].bitmap =
	malloc (cmex_ufp_file->header.pattern_size);
      if (cmex_ufp_file->at[i].bitmap == NULL)
	{
	  perror ("CMEX_UFP_file_read_all()");
	  exit (ENOMEM);
	}
      number_of_items_read = fread (cmex_ufp_file->at[i].bitmap,
				    cmex_ufp_file->header.pattern_size, 1,
				    cmex_ufp_file->file);
      if (number_of_items_read != 1)
	{
	  perror ("CMEX_UFP_file_read_all()");
	  exit (EIO);
	}
    }
}

void 
CMEX_UFP_file_write_all (CMEX_UFP_file * cmex_ufp_file)
{

  int number_of_items_written;
  unsigned i;

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  fseek (cmex_ufp_file->file, 0, SEEK_SET);

  number_of_items_written = fwrite (&cmex_ufp_file->header,
		     sizeof (CMEX_UFP_file_header), 1, cmex_ufp_file->file);
  if (number_of_items_written != 1)
    {
      perror ("CMEX_UFP_file_write_all()");
      exit (EIO);
    }

  for (i = 0; i < cmex_ufp_file->header.char_count; i++)
    {

      /* magic number 4 */
      number_of_items_written = fwrite (&cmex_ufp_file->at[i],
					4, 1, cmex_ufp_file->file);
      if (number_of_items_written != 1)
	{
	  perror ("CMEX_UFP_file_write_all()");
	  exit (EIO);
	}

      number_of_items_written = fwrite (cmex_ufp_file->at[i].bitmap,
				      cmex_ufp_file->header.pattern_size, 1,
					cmex_ufp_file->file);
      if (number_of_items_written != 1)
	{
	  perror ("CMEX_UFP_file_write_all()");
	  exit (EIO);
	}
    }
}

void 
CMEX_UFP_file_add_char (CMEX_UFP_file * cmex_ufp_file, unsigned char code_highbyte, unsigned char code_lowbyte, BITMAP * bitmap)
{

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  cmex_ufp_file->at[cmex_ufp_file->header.char_count].code_bank_id = CMEX_UFP_DEFAULT_CODE_BANK_ID;
  cmex_ufp_file->at[cmex_ufp_file->header.char_count].code_highbyte = code_highbyte;
  cmex_ufp_file->at[cmex_ufp_file->header.char_count].code_lowbyte = code_lowbyte;
  cmex_ufp_file->at[cmex_ufp_file->header.char_count].bitmap = malloc (cmex_ufp_file->header.pattern_size);

  if (cmex_ufp_file->at[cmex_ufp_file->header.char_count].bitmap == NULL)
    {
      perror ("CMEX_UFP_file_add_char()");
      exit (ENOMEM);
    }

  memmove (cmex_ufp_file->at[cmex_ufp_file->header.char_count].bitmap, bitmap, cmex_ufp_file->header.pattern_size);

  cmex_ufp_file->header.char_count++;
}

void 
CMEX_UFP_file_delete_char (CMEX_UFP_file * cmex_ufp_file, int index)
{

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  memmove (&cmex_ufp_file->at[index], &cmex_ufp_file->at[index + 1],
     sizeof (CMEX_UFP_char) * cmex_ufp_file->header.char_count - index - 1);

  cmex_ufp_file->header.char_count--;
}

CMEX_typeface 
CMEX_UFP_file_get_typeface (CMEX_UFP_file * cmex_ufp_file)
{

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  return cmex_ufp_file->header.font_info.typeface;
}

void 
CMEX_UFP_file_set_typeface (CMEX_UFP_file * cmex_ufp_file, CMEX_typeface typeface)
{

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  cmex_ufp_file->header.font_info.typeface = typeface;
  cmex_ufp_file->header.font_info.font_name[5] =
    CMEX_typeface_char (typeface);
}

int 
CMEX_UFP_char_compare (const void *e1, const void *e2)
{
  CMEX_UFP_char *cmex_ufp_char1, *cmex_ufp_char2;
  int return_value;

  cmex_ufp_char1 = (CMEX_UFP_char *) e1;
  cmex_ufp_char2 = (CMEX_UFP_char *) e2;

  return_value = cmex_ufp_char1->code_bank_id - cmex_ufp_char2->code_bank_id;
  if (return_value != 0)
    return return_value;

  return_value = cmex_ufp_char1->code_highbyte - cmex_ufp_char2->code_highbyte;
  if (return_value != 0)
    return return_value;

  return_value = cmex_ufp_char1->code_lowbyte - cmex_ufp_char2->code_lowbyte;
  return return_value;
}

void 
CMEX_UFP_file_sort (CMEX_UFP_file * cmex_ufp_file)
{

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  qsort (cmex_ufp_file->at, cmex_ufp_file->header.char_count,
	 sizeof (CMEX_UFP_char), &CMEX_UFP_char_compare);
}

CMEX_UFP_char *
CMEX_UFP_char_in_file (CMEX_UFP_char * cmex_ufp_char, CMEX_UFP_file * cmex_ufp_file)
{

  assert (cmex_ufp_file != NULL);
  assert (cmex_ufp_file->file != NULL);

  return bsearch (cmex_ufp_char, cmex_ufp_file->at, cmex_ufp_file->header.char_count,
		  sizeof (CMEX_UFP_char), &CMEX_UFP_char_compare);
}
