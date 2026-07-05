#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <assert.h>

#include "xfn.h"
#include "convert.h"

char *
XFN_typeface_index_to_chinese_string (unsigned char typeface)
{

  static char *XFN_typeface_chinese_string_array[] =
  {
    "明體", "楷書", "圓體", "黑體", "隸書",
    "行書", "仿宋", "細明", "粗明", "粗黑",
    "符號", "未知"};

  if (typeface > XFN_max_id_of_typeface)
    typeface = XFN_max_id_of_typeface + 1;

  return XFN_typeface_chinese_string_array[typeface];
}

XFN_file *
XFN_file_open (const char *filename, const char *mode)
{

  XFN_file *xfn_file;

  xfn_file = malloc (sizeof (XFN_file));
  if (xfn_file == NULL)
    {
      perror ("XFN_file_open()");
      exit (ENOMEM);
    }
  memset (xfn_file, 0, sizeof (XFN_file));

  xfn_file->file = fopen (filename, mode);
  if (xfn_file->file == NULL)
    {
      perror ("XFN_file_open()");
      exit (ENOENT);
    }
  return xfn_file;
}

XFN_file *
XFN_file_new (const char *filename)
{

  XFN_file *xfn_file;

  xfn_file = XFN_file_open (filename, "wb");

  xfn_file->header.id[0] = 'E';
  xfn_file->header.id[1] = 'T';
  xfn_file->header.id[2] = 0xFF;
  xfn_file->header.id[3] = 0xFF;
  xfn_file->header.id[4] = 0xFF;
  xfn_file->header.id[5] = 0xFF;
  xfn_file->header.number_of_char = 0;
  xfn_file->header.unknown[0] = 0x10;
  xfn_file->header.unknown[1] = 0x7F;
  xfn_file->header.unknown[2] = 0;
  xfn_file->header.number_of_index = 1;
  xfn_file->header.zero[0] = 0;
  xfn_file->header.zero[1] = 0;
  xfn_file->header.zero[2] = 0;
  xfn_file->header.zero[3] = 0;

  return xfn_file;
}

void 
XFN_file_read_header (XFN_file * xfn_file)
{

  int number_of_items_read;

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  number_of_items_read = fread (&xfn_file->header,
				sizeof (XFN_header), 1, xfn_file->file);
  if (number_of_items_read == 0)
    {
      perror ("XFN_file_read_header()");
      exit (EIO);
    }
}

void 
XFN_file_write_header (const XFN_file * xfn_file)
{

  int number_of_items_written;

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  number_of_items_written = fwrite (&xfn_file->header,
				    sizeof (XFN_header), 1, xfn_file->file);
  if (number_of_items_written == 0)
    {
      perror ("XFN_file_write_header()");
      exit (EIO);
    }
}

void 
XFN_file_read_index (XFN_file * xfn_file)
{

  int number_of_items_read;

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  number_of_items_read = fread (&xfn_file->at, sizeof (XFN_char),
			   xfn_file->header.number_of_char, xfn_file->file);
  if (number_of_items_read != xfn_file->header.number_of_char)
    {
      perror ("XFN_file_read_index()");
      exit (EIO);
    }
}

void 
XFN_file_write_index (const XFN_file * xfn_file)
{

  int number_of_items_to_write, number_of_items_written;

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  number_of_items_to_write = xfn_file->header.number_of_index * XFN_number_of_char_per_index;

  number_of_items_written = fwrite (&xfn_file->at, sizeof (XFN_char),
				  number_of_items_to_write, xfn_file->file);
  if (number_of_items_written != number_of_items_to_write)
    {
      perror ("XFN_file_write_index()");
      exit (EIO);
    }
}

int 
XFN_load_char (const XFN_file * xfn_file, const XFN_char * xfn_char,
	       BITMAP * bitmap, size_t size_of_bitmap)
{

  long offset;
  size_t size;

  size = xfn_char->size8 * xfn_char->size8 * 8;

  if (size_of_bitmap < size)
    return EINVAL;

  /* is it correct? */
  /* better convert procedure? */
  offset = xfn_char->pos2 * 0x10000 + xfn_char->pos1 * 0x100 +
    xfn_char->pos0;

  fseek (xfn_file->file, offset, SEEK_SET);

  fread (bitmap, size, 1, xfn_file->file);

  return 0;
}

int 
XFN_store_char (const XFN_file * xfn_file, const XFN_char xfn_char,
		BITMAP * bitmap, size_t size_of_bitmap)
{

  long offset;
  size_t size;

  size = xfn_char.size8 * xfn_char.size8 * 8;

  if (size_of_bitmap < size)
    return EINVAL;

  /* is it correct? */
  /* better convert procedure? */
  offset = xfn_char.pos2 * 0x10000 + xfn_char.pos1 * 0x100 +
    xfn_char.pos0;

  fseek (xfn_file->file, offset, SEEK_SET);

  fwrite (bitmap, size, 1, xfn_file->file);

  return 0;
}

int 
XFN_store_char_without_seek (const XFN_file * xfn_file, const XFN_char xfn_char,
			     BITMAP * bitmap, size_t size_of_bitmap)
{

  size_t size;

  size = xfn_char.size8 * xfn_char.size8 * 8;

  if (size_of_bitmap < size)
    return EINVAL;

  fwrite (bitmap, size, 1, xfn_file->file);

  return 0;
}

int 
XFN_copy_char (const XFN_file * xfn_from_file, const XFN_file * xfn_to_file,
	       const XFN_char xfn_from_char)
{

  long offset;
  size_t size;
  void *buffer;

  size = xfn_from_char.size8 * xfn_from_char.size8 * 8;

  buffer = malloc (size);
  if (buffer == NULL)
    {
      perror ("XFN_copy_char()");
      exit (1);
    }

  /* is it correct? */
  /* better convert procedure? */
  offset = xfn_from_char.pos2 * 0x10000 + xfn_from_char.pos1 * 0x100 +
    xfn_from_char.pos0;

  if (fseek (xfn_from_file->file, offset, SEEK_SET))
    {
      perror ("XFN_copy_char()");
      exit (2);
    };

  if (fread (buffer, size, 1, xfn_from_file->file) != 1)
    {
      perror ("XFN_copy_char()");
      exit (3);
    };

  if (fwrite (buffer, size, 1, xfn_to_file->file) != 1)
    {
      perror ("XFN_copy_char()");
      exit (4);
    }

  free (buffer);

  return 0;
}

int 
XFN_char_compare (const void *e1, const void *e2)
{
  XFN_char *xfn_char1, *xfn_char2;
  int return_value;

  xfn_char1 = (XFN_char *) e1;
  xfn_char2 = (XFN_char *) e2;

  return_value = xfn_char1->typeface - xfn_char2->typeface;
  if (return_value != 0)
    return return_value;

  return_value = xfn_char1->size8 - xfn_char2->size8;
  if (return_value != 0)
    return return_value;

  return_value = xfn_char1->code_highbyte - xfn_char2->code_highbyte;
  if (return_value != 0)
    return return_value;

  return_value = xfn_char1->code_lowbyte - xfn_char2->code_lowbyte;
  return return_value;
}

void 
XFN_file_sort_index (XFN_file * xfn_file)
{

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  qsort (xfn_file->at, xfn_file->header.number_of_char,
	 sizeof (XFN_char), &XFN_char_compare);
}

void 
XFN_file_recalculate_index (XFN_file * xfn_file)
{

  int i;
  long offset;

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  offset = sizeof (XFN_header) + sizeof (XFN_char) * XFN_number_of_char_per_index * xfn_file->header.number_of_index;
  for (i = 0; i < xfn_file->header.number_of_char; i++)
    {
      xfn_file->at[i].pos2 = (offset & 0x00FF0000) >> 16;
      xfn_file->at[i].pos1 = (offset & 0x0000FF00) >> 8;
      xfn_file->at[i].pos0 = (offset & 0x000000FF);
      offset += xfn_file->at[i].size8 * xfn_file->at[i].size8 * 8;
    }
}

void *
XFN_char_in_file (XFN_char * xfn_char, XFN_file * xfn_file)
{

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  return bsearch (xfn_char, xfn_file->at, xfn_file->header.number_of_char,
		  sizeof (XFN_char), &XFN_char_compare);
}

void 
XFN_file_kaize (XFN_file * xfn_file)
{

  int i;

  assert (xfn_file != NULL);
  assert (xfn_file->file != NULL);

  for (i = 0; i < xfn_file->header.number_of_char; i++)
    {
      xfn_file->at[i].typeface = XFN_typeface_kai;
    }
}

unsigned short
XFN_char_get_big5_code (XFN_char * xfn_char)
{

  unsigned short code;
  
  code = (xfn_char->code_highbyte << 8) | xfn_char->code_lowbyte;
  
  return code;
}

void
XFN_char_set_big5_code (XFN_char * xfn_char, unsigned short code)
{
  xfn_char->code_highbyte = (code & 0xFF00) >> 8;
  xfn_char->code_lowbyte = (code & 0xFF);
}

unsigned short
XFN_char_get_serial_code (XFN_char * xfn_char)
{

  unsigned short code;
  unsigned char h, l;
  
  charset_BIG52Serial (&h, &l, xfn_char->code_highbyte, xfn_char->code_lowbyte);
  code = (h << 8) | l;
  
  return code;
}

void
XFN_char_set_serial_code (XFN_char * xfn_char, unsigned short code)
{

  unsigned char h, l;

  charset_Serial2BIG5 (&h, &l, (code & 0xFF00) >> 8, (code & 0xFF));
  xfn_char->code_highbyte = h;
  xfn_char->code_lowbyte = l;    
}
