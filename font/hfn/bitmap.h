#ifndef __BITMAP_H
#define __BITMAP_H

typedef unsigned char BITMAP;

void BITMAP_set_pixel (BITMAP * bitmap, const int width,
		       const int w, const int h, const int p);
int BITMAP_get_pixel (const BITMAP * bitmap, const int width,
		      const int w, const int h);
#ifdef GRAPHICS
void BITMAP_display (BITMAP * bitmap, int width, int height);
#endif
int BITMAP_resize (BITMAP * dest, const int dest_width, const int dest_height,
		   const size_t size_of_dest,
		   BITMAP * src, const int src_width, const int src_height);
void BITMAP_copy (BITMAP * dest, const int dest_width, const int dest_height,
		  BITMAP * src, const int src_width, const int src_height,
		  const int offset_width, const int offset_height);

#endif
