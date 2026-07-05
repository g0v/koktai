/* ufinfo.h */
#ifndef __TAI_H
#define __TAI_H

enum TAI_typeface_e
  {
    TAI_typeface_ming = 0,
    TAI_typeface_kai,
    TAI_typeface_round,
    TAI_typeface_black,
    TAI_typeface_li,
    TAI_typeface_shing,
    TAI_typeface_fonsung,
    TAI_typeface_minglight,
    TAI_typeface_mingbold,
    TAI_typeface_blackbold,
    TAI_typeface_symbol,
    TAI_typeface_unknown = -2,
    TAI_typeface_any = -1
  };

typedef enum TAI_typeface_e TAI_typeface;

#define	TAI_FONTINFO_SPELL_STRING_LENGTH	(4)

struct TAI_fontinfo_s
  {
    TAI_typeface typeface;
    unsigned char code_highbyte;
    unsigned char code_lowbyte;
    char spell[TAI_FONTINFO_SPELL_STRING_LENGTH];
    int tone;
  };

typedef struct TAI_fontinfo_s TAI_fontinfo;

TAI_typeface TAI_typeface_string_to_index (const char *typeface_string);
int TAI_fontinfo_parse (TAI_fontinfo * fontinfo, const char *string);
int TAI_spell_to_index (const char c);

#endif
