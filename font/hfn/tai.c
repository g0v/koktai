#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <assert.h>

#include "tai.h"

TAI_typeface 
TAI_typeface_string_to_index (const char *typeface_string)
{
  if (strcmp (typeface_string, "m") == 0)
    return TAI_typeface_ming;
  else if (strcmp (typeface_string, "k") == 0)
    return TAI_typeface_kai;
  else if (strcmp (typeface_string, "m3") == 0)
    return TAI_typeface_minglight;
  else
    {
      perror ("TAI_typeface_string_to_index()");
      exit (EDOM);
    }
}

int 
TAI_fontinfo_parse (TAI_fontinfo * fontinfo, const char *string)
{

  char *buf, *tok;
  int spell_length;

  assert (fontinfo != NULL);
  assert (string != NULL);

  buf = malloc (sizeof (string));
  if (buf == NULL)
    {
      perror ("TAI_fontinfo_parse()");
      exit (ENOMEM);
    }
  strcpy (buf, string);

  /* typeface */

  tok = strtok (buf, " ");
  if (tok != NULL)
    {
      fontinfo->typeface = TAI_typeface_string_to_index (tok);
    }
  else
    {
      perror ("TAI_fontinfo_parse(): typeface");
      return EDOM;
    }

  /* code */

  tok = strtok (0, " ");
  if (tok != NULL)
    {
      if (strlen (tok) != 2)
	{
	  perror ("TAI_fontinfo_parse(): code");
	  return EDOM;
	}
      fontinfo->code_highbyte = tok[0];
      fontinfo->code_lowbyte = tok[1];
    }
  else
    {
      perror ("TAI_fontinfo_parse(): code");
      return EDOM;
    }

  /* spell */

  tok = strtok (0, " ");
  if (tok != NULL)
    {
      spell_length = strrchr (tok, ',') - tok;
      if ((spell_length < 1) || (3 < spell_length))
	{
	  perror ("TAI_fontinfo_parse(): spell");
	  return EDOM;
	}
      strncpy (fontinfo->spell, tok, spell_length);
      fontinfo->spell[spell_length] = '\0';
    }
  else
    {
      perror ("TAI_fontinfo_parse(): spell");
      return EDOM;
    }

  /* tone */

  fontinfo->tone = atoi (tok + spell_length + 1);
  if ((fontinfo->tone < 1) || (fontinfo->tone > 15))
    {
      perror ("TAI_fontinfo_parse(): tone");
      return EDOM;
    }

  free (buf);

  return 0;
};

int 
TAI_spell_to_index (const char c)
{
  switch (c)
    {
    case '1':
      return 0;
      break;
    case '!':
      return 1;
      break;
    case 'q':
      return 2;
      break;
    case 'a':
      return 3;
      break;
    case 'z':
      return 4;
      break;
    case '2':
      return 6;
      break;
    case '@':
      return 7;
      break;
    case 'w':
      return 8;
      break;
    case 's':
      return 9;
      break;
    case 'x':
      return 10;
      break;
    case 'e':
      return 11;
      break;
    case 'E':
      return 12;
      break;
    case 'd':
      return 13;
      break;
    case '=':
      return 14;
      break;
    case 'c':
      return 15;
      break;
    case 'r':
      return 16;
      break;
    case 'R':
      return 17;
      break;
    case 'f':
      return 18;
      break;
    case 'C':
      return 19;
      break;
    case 'v':
      return 20;
      break;
    case '5':
      return 21;
      break;
    case 't':
      return 22;
      break;
    case 'g':
      return 23;
      break;
    case 'b':
      return 24;
      break;
    case 'y':
      return 25;
      break;
    case 'Y':
      return 26;
      break;
    case 'h':
      return 27;
      break;
    case 'n':
      return 28;
      break;
    case '8':
      return 29;
      break;
    case '*':
      return 30;
      break;
    case '[':
      return 31;
      break;
    case '{':
      return 32;
      break;
    case 'i':
      return 33;
      break;
    case 'K':
      return 34;
      break;
    case 'k':
      return 35;
      break;
    case ',':
      return 36;
      break;
    case ']':
      return 37;
      break;
    case '}':
      return 38;
      break;
    case '9':
      return 39;
      break;
    case '(':
      return 40;
      break;
    case 'o':
      return 41;
      break;
    case 'l':
      return 42;
      break;
    case 'L':
      return 43;
      break;
    case '.':
      return 44;
      break;
    case '#':
      return 45;
      break;
    case '$':
      return 46;
      break;
    case 'A':
      return 47;
      break;
    case '\'':
      return 48;
      break;
    case '0':
      return 49;
      break;
    case 'p':
      return 50;
      break;
    case ';':
      return 51;
      break;
    case ':':
      return 52;
      break;
    case '/':
      return 53;
      break;
    case '+':
      return 54;
      break;
    case '-':
      return 55;
      break;
    case 'u':
      return 56;
      break;
    case 'U':
      return 57;
      break;
    case 'j':
      return 58;
      break;
    case '&':
      return 59;
      break;
    case 'J':
      return 60;
      break;
    case 'm':
      return 61;
      break;
    case '\\':
      return 62;
      break;
    default:
      return -1;
    }
}
