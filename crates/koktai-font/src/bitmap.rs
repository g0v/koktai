//! Packed monochrome bitmap helpers (port of `bitmap.c`).

/// MSB-first within each byte; `width` must be a multiple of 8.
pub fn get_pixel(bitmap: &[u8], width: usize, x: usize, y: usize) -> bool {
    debug_assert!(width % 8 == 0);
    let width8 = width / 8;
    let offset = width8 * y + x / 8;
    let mask = 1u8 << (7 - (x % 8));
    bitmap.get(offset).is_some_and(|b| b & mask != 0)
}

/// Row-major RGBA raster for GIF export (ink = opaque black, background = transparent).
/// Matches legacy `gdImageColorTransparent(im, white)` in `xfn2gif.c`.
pub fn to_rgba_raster(bitmap: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut out = Vec::with_capacity(width * height * 4);
    for y in 0..height {
        for x in 0..width {
            if get_pixel(bitmap, width, x, y) {
                out.extend_from_slice(&[0, 0, 0, 255]);
            } else {
                out.extend_from_slice(&[255, 255, 255, 0]);
            }
        }
    }
    out
}