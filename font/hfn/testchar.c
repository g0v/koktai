#include <stdio.h>
#include "convert.h"

int
main (void)
{
  unsigned int i, o;
  unsigned char ih, il, o1h, o1l, o2h, o2l;
  
  for (i = 0xE000; i < 0xE000 + 5809; i++)
    {
      ih = (i & 0xFF00) >> 8;
      il = (i & 0xFF);
      charset_Serial2BIG5(&o1h, &o1l, ih, il);
      charset_BIG52Serial(&o2h, &o2l, o1h, o1l);
      o = (o2h << 8) | o2l;
      if (i != o) printf ("%4x\t%4x\n", i, o);
    }
  printf ("\n");
  
  return 0;
}