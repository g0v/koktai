#include <stdio.h>
#include <assert.h>

#include "tai.h"
#include "xfn.h"
#include "cmexfont.h"

TAI_typeface 
typeface_XFN2TAI (unsigned char xfn_typeface)
{
  switch (xfn_typeface)
    {
    case XFN_typeface_ming:
      return TAI_typeface_ming;
    case XFN_typeface_kai:
      return TAI_typeface_kai;
    case XFN_typeface_shing:
      return TAI_typeface_shing;
    case XFN_typeface_minglight:
      return TAI_typeface_minglight;
    default:
      fprintf (stderr, "typeface_XFN2TAI(): unknown XFN typeface id %d\n", xfn_typeface);
      exit (1);
    }
}

unsigned char 
typeface_TAI2XFN (TAI_typeface tai_typeface)
{
  switch (tai_typeface)
    {
    case TAI_typeface_ming:
      return XFN_typeface_ming;
    case TAI_typeface_kai:
      return XFN_typeface_kai;
    case TAI_typeface_minglight:
      return XFN_typeface_minglight;
    default:
      fprintf (stderr, "typeface_TAI2XFN(): unknown TAI typeface id %d\n", tai_typeface);
      exit (1);
    }
}

CMEX_typeface
typeface_TAI2CMEX (TAI_typeface tai_typeface)
{
  switch (tai_typeface)
    {
    case TAI_typeface_ming:
      return CMEX_typeface_ming;
    case TAI_typeface_kai:
      return CMEX_typeface_kai;
    case TAI_typeface_minglight:
      return CMEX_typeface_ming;
    default:
      fprintf (stderr, "typeface_TAI2CMEX(): unknown TAI typeface id %d\n", tai_typeface);
      exit (1);
    }
}

void 
charset_BIG52Serial (unsigned char *dest_hb, unsigned char *dest_lb,
		     unsigned char src_hb, unsigned char src_lb)
{

  unsigned short dest = 0;

  if ((0xFA <= src_hb) && (src_hb <= 0xFE))
    dest = (src_hb - 0xFA) * 157;
  if ((0x8E <= src_hb) && (src_hb <= 0xA0))
    dest = (src_hb - 0x8E + 5) * 157;
  if ((0x81 <= src_hb) && (src_hb <= 0x8D))
    dest = (src_hb - 0x81 + 24) * 157;
  assert ((src_hb == 0xFA) || (dest != 0));

  if ((0x40 <= src_lb) && (src_lb <= 0x7E))
    dest += src_lb - 0x40;
  if ((0xA1 <= src_lb) && (src_lb <= 0xFE))
    dest += src_lb - 0xA1 + 63;
  assert ((src_lb == 0x40) || (dest != 0));

  dest += 0xE000;

  *dest_hb = (dest & 0xFF00) >> 8;
  *dest_lb = (dest & 0xFF);
}

void
charset_Serial2BIG5 (unsigned char *dest_hb, unsigned char *dest_lb,
                     unsigned char src_hb, unsigned char src_lb)
{

  unsigned short src = ((src_hb << 8) | src_lb) - 0xE000;
  
  *dest_hb = src / 157;

  if (/* (0 <= *dest_hb) && */ (*dest_hb <= 4)) /* supress warning */
    *dest_hb = *dest_hb + 0xFA;
  else if ((5 <= *dest_hb) && (*dest_hb <= 23))
    *dest_hb = *dest_hb - 5 + 0x8E;
  else if ((24 <= *dest_hb) && (*dest_hb <= 36))
    *dest_hb = *dest_hb - 24 + 0x81;
  else
    assert (0);

  *dest_lb = src % 157;
  
  if (/* (0 <= *dest_lb) && */ (*dest_lb <= 62)) /* supress warning */
    *dest_lb = *dest_lb + 0x40;
  else if ((63 <= *dest_lb) && (*dest_lb <= 156))
    *dest_lb = *dest_lb - 63 + 0xA1;
  else
    assert (0);
}