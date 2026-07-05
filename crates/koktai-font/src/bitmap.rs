//! Packed monochrome bitmap helpers (port of `bitmap.c`).

/// MSB-first within each byte; `width` must be a multiple of 8.
pub fn get_pixel(bitmap: &[u8], width: usize, x: usize, y: usize) -> bool {
    debug_assert!(width % 8 == 0);
    let width8 = width / 8;
    let offset = width8 * y + x / 8;
    let mask = 1u8 << (7 - (x % 8));
    bitmap.get(offset).is_some_and(|b| b & mask != 0)
}

/// Row-major RGB raster for GIF export (ink = black, background = white).
pub fn to_rgb_raster(bitmap: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut out = Vec::with_capacity(width * height * 3);
    for y in 0..height {
        for x in 0..width {
            let v = if get_pixel(bitmap, width, x, y) {
                0u8
            } else {
                255u8
            };
            out.extend_from_slice(&[v, v, v]);
        }
    }
    out
}