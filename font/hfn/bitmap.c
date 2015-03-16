#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <assert.h>

#ifdef GRAPHICS
#include <grx20.h>
#endif

#include "bitmap.h"

#define	BITMAP_resize_threshold	(0.3)

void 
BITMAP_set_pixel (BITMAP * bitmap, const int width,
		  const int w, const int h, const int p)
{

  int width8, offset;
  BITMAP mask;

  assert (bitmap != NULL);
  assert (width % 8 == 0);
  assert ((p == 0) || (p == 1));

  width8 = width / 8;
  offset = width8 * h + w / 8;

  if (p == 1)
    {
      mask = 1 << (7 - w % 8);
      bitmap[offset] |= mask;
    }
  else
    {
      mask = ~(1 << (7 - w % 8));
      bitmap[offset] &= mask;
    }
}

int 
BITMAP_get_pixel (const BITMAP * bitmap, const int width,
		  const int w, const int h)
{

  int width8, offset;
  BITMAP mask;

  assert (bitmap != NULL);
  assert (width % 8 == 0);

  width8 = width / 8;
  offset = width8 * h + w / 8;
  mask = 1 << (7 - w % 8);

  return (bitmap[offset] & mask) ? 1 : 0;
}

#ifdef GRAPHICS
void 
BITMAP_display (BITMAP * bitmap, int width, int height)
{

  int w, h;
  long white;

  assert (bitmap != NULL);
  assert (width % 8 == 0);

  white = GrWhite ();

  for (h = 0; h < height; h++)
    for (w = 0; w < width; w++)
      if (BITMAP_get_pixel (bitmap, width, w, h))
	GrPlot (w, h, white);
}
#endif

int 
BITMAP_resize (BITMAP * dest, const int dest_width, const int dest_height,
	       const size_t size_of_dest,
	       BITMAP * src, const int src_width, const int src_height)
{

  int s_w, s_h, d_w, d_h;	/* index of src_width, src_height,
				   dest_width, dest_height */
  double *wp;			/* workplace */
  size_t demend_size_of_dest, size_of_wp;
  double b_w, b_h;		/* boundry of width, height */
  double b_b_w, a_b_w, b_b_h, a_b_h;
  /* length before/after boundry width/height */
  double average;

  assert (src != NULL);
  assert (dest != NULL);
  assert (src_width % 8 == 0);
  assert (dest_width % 8 == 0);

  demend_size_of_dest = dest_width * dest_height / 8;
  if (demend_size_of_dest > size_of_dest)
    {
      return EINVAL;
    }
  memset (dest, 0, demend_size_of_dest);

  size_of_wp = sizeof (double) * dest_width * dest_height;
  wp = malloc (size_of_wp);
  if (wp == NULL)
    {
      perror ("BITMAP_resize()");
      exit (ENOMEM);
    }
  memset (wp, 0, size_of_wp);

  /* force to compute first boundry height */
  d_h = -1;
  b_h = 0;

  for (s_h = 0; s_h < src_height; s_h++)
    {
      if (s_h >= b_h)
	{
	  d_h++;
	  b_h = (double) (d_h + 1) / dest_height * src_height;
	}
      b_b_h = b_h - s_h;
      a_b_h = s_h + 1 - b_h;
      if (b_b_h > 1)
	{
	  b_b_h = 1;
	  a_b_h = 0;
	}

      d_w = -1;
      b_w = 0;
      for (s_w = 0; s_w < src_width; s_w++)
	{
	  if (s_w >= b_w)
	    {
	      d_w++;
	      b_w = (double) (d_w + 1) / dest_width * src_width;
	    }
	  b_b_w = b_w - s_w;
	  a_b_w = s_w + 1 - b_w;
	  if (b_b_w > 1)
	    {
	      b_b_w = 1;
	      a_b_w = 0;
	    }

	  if (BITMAP_get_pixel (src, src_width, s_w, s_h))
	    {
	      wp[d_h * dest_width + d_w] += b_b_w * b_b_h;
	      wp[d_h * dest_width + (d_w + 1)] += a_b_w * b_b_h;
	      wp[(d_h + 1) * dest_width + d_w] += b_b_w * a_b_h;
	      wp[(d_h + 1) * dest_width + (d_w + 1)] += a_b_w * a_b_h;
	    }
	}
    }

  average = src_width * src_height / dest_width / dest_height * BITMAP_resize_threshold;

  for (d_h = 0; d_h < dest_height; d_h++)
    {
      for (d_w = 0; d_w < dest_width; d_w++)
	{
	  if (wp[d_h * dest_width + d_w] > average)
	    BITMAP_set_pixel (dest, dest_width, d_w, d_h, 1);
	}
    }

  free (wp);

  return 0;
}

void 
BITMAP_copy (BITMAP * dest, const int dest_width, const int dest_height,
	     BITMAP * src, const int src_width, const int src_height,
	     const int offset_width, const int offset_height)
{

  int w, h, clipped_src_width, clipped_src_height;

  assert (src != NULL);
  assert (dest != NULL);
  assert (src_width % 8 == 0);
  assert (dest_width % 8 == 0);

  if (offset_height + src_height > dest_height)
    clipped_src_height = dest_height - offset_height;
  else
    clipped_src_height = src_height;

  if (offset_width + src_width > dest_width)
    clipped_src_width = dest_width - offset_width;
  else
    clipped_src_width = src_width;

  for (h = 0; h < clipped_src_height; h++)
    {
      for (w = 0; w < clipped_src_width; w++)
	{
	  if (BITMAP_get_pixel (src, src_width, w, h))
	    {
	      BITMAP_set_pixel (dest, dest_width, offset_width + w, offset_height + h, 1);
	    }
	}
    }
}
