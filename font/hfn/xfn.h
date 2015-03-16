#ifndef __XFN_H
#define __XFN_H

#include <stdio.h>
#include "bitmap.h"

#define	XFN_max_number_of_char_per_file	(64*256)
#define XFN_number_of_char_per_index	(256)

#define XFN_max_id_of_typeface	(10)

#define	XFN_typeface_ming	(0)
#define	XFN_typeface_kai	(1)
#define XFN_typeface_round	(2)
#define	XFN_typeface_black	(3)
#define	XFN_typeface_li		(4)
#define	XFN_typeface_shing	(5)
#define	XFN_typeface_fonsung	(6)
#define	XFN_typeface_minglight	(7)
#define	XFN_typeface_mingbold	(8)
#define	XFN_typeface_blackbold	(9)
#define	XFN_typeface_symbol	(10)

struct XFN_header_s
  {
    unsigned char id[6];
    unsigned short number_of_char;
    unsigned char unknown[3];
    unsigned char number_of_index;
    unsigned char zero[4];
  }
__attribute__ ((packed));

typedef struct XFN_header_s XFN_header;

struct XFN_char_s
  {
    unsigned char typeface;
    unsigned char code_highbyte;
    unsigned char code_lowbyte;
    unsigned char size8;
    unsigned char pos2;		/* most siginificant byte */
    unsigned char pos1;
    unsigned char pos0;		/* least significant byte */
    unsigned char unknown;
  }
__attribute__ ((packed));

typedef struct XFN_char_s XFN_char;

struct XFN_file_s
  {
    FILE *file;
    XFN_header header;
    XFN_char at[XFN_max_number_of_char_per_file];
  }
__attribute__ ((packed));

typedef struct XFN_file_s XFN_file;

char *XFN_typeface_index_to_chinese_string (unsigned char typeface);
XFN_file *XFN_file_open (const char *filename, const char *mode);
XFN_file *XFN_file_new (const char *filename);
void XFN_file_read_header (XFN_file * xfn_file);
void XFN_file_write_header (const XFN_file * xfn_file);
void XFN_file_read_index (XFN_file * xfn_file);
void XFN_file_write_index (const XFN_file * xfn_file);
int XFN_load_char (const XFN_file * xfn_file, const XFN_char * xfn_char,
		   BITMAP * bitmap, size_t size_of_bitmap);
int XFN_store_char (const XFN_file * xfn_file, const XFN_char xfn_char,
		    BITMAP * bitmap, size_t size_of_bitmap);
int XFN_store_char_without_seek (const XFN_file * xfn_file, const XFN_char xfn_char,
				 BITMAP * bitmap, size_t size_of_bitmap);
int XFN_copy_char (const XFN_file * xfn_from_file, const XFN_file * xfn_to_file,
		   const XFN_char xfn_from_char);
int XFN_char_compare (const void *e1, const void *e2);
void XFN_file_sort_index (XFN_file * xfn_file);
void XFN_file_recalculate_index (XFN_file * xfn_file);
void *XFN_char_in_file (XFN_char * xfn_char, XFN_file * xfn_file);
void XFN_file_kaize (XFN_file * xfn_file);
unsigned short XFN_char_get_big5_code (XFN_char * xfn_char);
void XFN_char_set_big5_code (XFN_char * xfn_char, unsigned short code);
unsigned short XFN_char_get_serial_code (XFN_char * xfn_char);
void XFN_char_set_serial_code (XFN_char * xfn_char, unsigned short code);

#endif
