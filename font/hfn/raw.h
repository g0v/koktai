#ifndef	__RAW_H
#define	__RAW_H

#include <stdio.h>

#include "bitmap.h"

#define	RAW_max_number_of_char_per_file	(128)

struct RAW_file_s
  {
    FILE *file;
    int char_width;
    int char_height;
    int number_of_char;
    BITMAP *at[RAW_max_number_of_char_per_file];
  };

typedef struct RAW_file_s RAW_file;

RAW_file *RAW_file_open (const char *filename, const int char_width,
			 const int char_height);

#endif
