//! XFN font file format (port of `xfn.h` / `xfn.c`).

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use crate::bitmap;
use crate::error::FontError;
use crate::io_ext::{read_u8, read_u16_le};
use crate::Result;

pub const XFN_MAX_CHARS: usize = 64 * 256;
pub const XFN_CHARS_PER_INDEX: usize = 256;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct XfnHeader {
    pub number_of_char: u16,
    pub number_of_index: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct XfnChar {
    pub typeface: u8,
    pub code_highbyte: u8,
    pub code_lowbyte: u8,
    pub size8: u8,
    pub pos2: u8,
    pub pos1: u8,
    pub pos0: u8,
    pub unknown: u8,
}

impl XfnChar {
    pub fn big5_code(self) -> u16 {
        u16::from(self.code_highbyte) << 8 | u16::from(self.code_lowbyte)
    }

    pub fn bitmap_offset(self) -> u64 {
        u64::from(self.pos2) * 0x1_0000 + u64::from(self.pos1) * 0x100 + u64::from(self.pos0)
    }

    pub fn bitmap_byte_len(self) -> usize {
        usize::from(self.size8) * usize::from(self.size8) * 8
    }

    pub fn pixel_width(self) -> usize {
        usize::from(self.size8) * 8
    }
}

pub struct XfnFile {
    file: File,
    pub header: XfnHeader,
    pub index: Vec<XfnChar>,
}

impl XfnFile {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let mut file = File::open(path)?;
        let mut id = [0u8; 6];
        file.read_exact(&mut id)?;
        if id[0] != b'E' || id[1] != b'T' {
            return Err(FontError::InvalidXfnId.into());
        }
        let number_of_char = read_u16_le(&mut file)?;
        let mut _unknown = [0u8; 3];
        file.read_exact(&mut _unknown)?;
        let number_of_index = read_u8(&mut file)?;
        let mut zero = [0u8; 4];
        file.read_exact(&mut zero)?;

        let header = XfnHeader {
            number_of_char,
            number_of_index,
        };

        let n = usize::from(number_of_char);
        let mut index = Vec::with_capacity(n);
        for _ in 0..n {
            index.push(read_xfn_char(&mut file)?);
        }

        Ok(Self { file, header, index })
    }

    pub fn load_char_bitmap(&mut self, ch: &XfnChar) -> Result<Vec<u8>> {
        let len = ch.bitmap_byte_len();
        let mut buf = vec![0u8; len];
        self.file.seek(SeekFrom::Start(ch.bitmap_offset()))?;
        self.file.read_exact(&mut buf)?;
        Ok(buf)
    }

    pub fn find_glyph(&self, typeface: u8, code: u16) -> Option<&XfnChar> {
        self.index
            .iter()
            .find(|c| c.typeface == typeface && c.big5_code() == code)
    }

    /// Export one glyph to a GIF file (port of `xfn2gif.c` + gd).
    pub fn export_gif(
        input: impl AsRef<Path>,
        typeface: u8,
        code: u16,
        output: impl AsRef<Path>,
    ) -> Result<()> {
        let mut xfn = Self::open(input)?;
        let ch = xfn
            .find_glyph(typeface, code)
            .copied()
            .ok_or(FontError::GlyphNotFound { typeface, code })?;
        let bitmap = xfn.load_char_bitmap(&ch)?;
        let w = ch.pixel_width();
        let h = w;
        let raster = bitmap::to_rgb_raster(&bitmap, w, h);
        let image: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> =
            image::ImageBuffer::from_raw(w as u32, h as u32, raster).ok_or_else(|| {
                FontError::BitmapSize {
                    expected: w * h * 3,
                    actual: bitmap.len(),
                }
            })?;
        image.save(output)?;
        Ok(())
    }
}

fn read_xfn_char(r: &mut impl Read) -> Result<XfnChar> {
    Ok(XfnChar {
        typeface: read_u8(r)?,
        code_highbyte: read_u8(r)?,
        code_lowbyte: read_u8(r)?,
        size8: read_u8(r)?,
        pos2: read_u8(r)?,
        pos1: read_u8(r)?,
        pos0: read_u8(r)?,
        unknown: read_u8(r)?,
    })
}