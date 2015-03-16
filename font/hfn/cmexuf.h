#ifndef __CMEXUF_H
#define __CMEXUF_H

#include <stdio.h>
#include "cmexfont.h"
#include "bitmap.h"

#define	CMEX_UFP_max_number_of_char_per_file	(8192)
#define	CMEX_UFP_DEFAULT_CODE_BANK_ID	(0x8001)

struct CMEX_UFP_file_header_s
  {
    unsigned short header_size;
    char user_font_sign[8];
    unsigned char major;
    unsigned char minor;
    unsigned char_count;
    unsigned short char_width;
    unsigned short char_height;
    unsigned pattern_size;
    unsigned char bank_id;
    unsigned short internal_bank_id;
    char reserved1[37];
    CMEX_font_information font_info;
    char reserved2[18];
    char copyright_msg[128];
  }
__attribute__ ((packed));

typedef struct CMEX_UFP_file_header_s CMEX_UFP_file_header;

struct CMEX_UFP_char_s
  {
    unsigned short code_bank_id;
    unsigned char code_lowbyte;
    unsigned char code_highbyte;
    BITMAP *bitmap;
  }
__attribute__ ((packed));

typedef struct CMEX_UFP_char_s CMEX_UFP_char;

struct CMEX_UFP_file_s
  {
    FILE *file;
    CMEX_UFP_file_header header;
    CMEX_UFP_char at[CMEX_UFP_max_number_of_char_per_file];
  };

typedef struct CMEX_UFP_file_s CMEX_UFP_file;

#define	CMEX_UFP_16x15_template_file	"cmexufp.15m"
#define	CMEX_UFP_24x24_template_file	"cmexufp.24m"

char CMEX_typeface_char (unsigned char typeface);
CMEX_UFP_file *CMEX_UFP_file_open (const char *filename, const char *mode);
CMEX_UFP_file *CMEX_UFP_file_new (const char *filename, const int size);
void CMEX_UFP_file_read_all (CMEX_UFP_file * cmex_ufp_file);
void CMEX_UFP_file_write_all (CMEX_UFP_file * cmex_ufp_file);
void CMEX_UFP_file_add_char (CMEX_UFP_file * cmex_ufp_file, unsigned char code_highbyte, unsigned char code_lowbyte, BITMAP * bitmap);
void CMEX_UFP_file_delete_char (CMEX_UFP_file * cmex_ufp_file, int index);
CMEX_typeface CMEX_UFP_file_get_typeface (CMEX_UFP_file * cmex_ufp_file);
void CMEX_UFP_file_set_typeface (CMEX_UFP_file * cmex_ufp_file, CMEX_typeface typeface);
int CMEX_UFP_char_compare (const void *e1, const void *e2);
void CMEX_UFP_file_sort (CMEX_UFP_file * cmex_ufp_file);

CMEX_UFP_char *CMEX_UFP_char_in_file (CMEX_UFP_char * cmex_ufp_char, CMEX_UFP_file * cmex_ufp_file);

#endif
