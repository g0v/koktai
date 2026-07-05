#ifndef __CONVERT_H
#define	__CONVERT_H

#include "tai.h"
#include "cmexfont.h"

TAI_typeface typeface_XFN2TAI (unsigned char xfn_typeface);
unsigned char typeface_TAI2XFN (TAI_typeface tai_typeface);
CMEX_typeface typeface_TAI2CMEX (TAI_typeface tai_typeface);
void charset_BIG52Serial (unsigned char *dest_hb, unsigned char *dest_lb,
		     unsigned char src_hb, unsigned char src_lb);
void charset_Serial2BIG5 (unsigned char *dest_hb, unsigned char *dest_lb,
		     unsigned char src_hb, unsigned char src_lb);

#endif
