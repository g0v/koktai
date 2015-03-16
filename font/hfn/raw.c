#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <assert.h>

#include "raw.h"

RAW_file *
RAW_file_open (const char *filename, const int char_width,
	       const int char_height)
{

  RAW_file *raw_file;
  size_t char_size;
  long file_size;
  int number_of_items_read, i;

  assert (char_width % 8 == 0);

  raw_file = malloc (sizeof (RAW_file));
  if (raw_file == NULL)
    {
      perror ("RAW_file_open()");
      exit (ENOMEM);
    }
  memset (raw_file, 0, sizeof (RAW_file));

  raw_file->file = fopen (filename, "rb");
  if (raw_file->file == NULL)
    {
      perror ("RAW_file_open()");
      exit (ENOENT);
    }

  raw_file->char_width = char_width;
  raw_file->char_height = char_height;

  fseek (raw_file->file, 0, SEEK_END);
  file_size = ftell (raw_file->file);
  fseek (raw_file->file, 0, SEEK_SET);
  char_size = char_width * char_height / 8;
  raw_file->number_of_char = file_size / char_size;

  for (i = 0; i < raw_file->number_of_char; i++)
    {
      raw_file->at[i] = malloc (char_size);
      if (raw_file->at[i] == NULL)
	{
	  perror ("RAW_file_open()");
	  exit (ENOMEM);
	}
      number_of_items_read = fread (raw_file->at[i],
				    char_size, 1, raw_file->file);
      if (number_of_items_read != 1)
	{
	  perror ("RAW_file_open()");
	  exit (EIO);
	}
    }

  return raw_file;
}
