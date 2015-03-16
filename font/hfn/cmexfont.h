#ifndef __CMEXFONT_H
#define __CMEXFONT_H

#define	CMEX_typeface_fon_sung	(0x80)
#define	CMEX_typeface_sung	(0x81)
#define	CMEX_typeface_ming	(0x81)
#define	CMEX_typeface_kai	(0x82)
#define	CMEX_typeface_yuang	(0x83)
#define	CMEX_typeface_hei	(0x84)
#define	CMEX_typeface_li	(0x85)
#define	CMEX_typeface_shing	(0x86)

typedef unsigned char CMEX_typeface;

struct CMEX_font_information_s
  {
    unsigned short info_size;
    unsigned short code_page;
    unsigned char char_set;
    CMEX_typeface typeface;
    char font_name[12];
    unsigned char_define;
    unsigned short cell_width;
    unsigned short cell_height;
    unsigned short char_height;
    unsigned short base_line;
    unsigned short underline;
    unsigned short underline_height;
    char stroke_weight;
    unsigned short char_style;
    unsigned char font_attrib;
    unsigned cell_width_max;
    unsigned cell_height_max;
  }
__attribute__ ((packed));

typedef struct CMEX_font_information_s CMEX_font_information;

#endif
