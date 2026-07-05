//! CMEX user font package format (port of `cmexuf.h` / `cmexuf.c`).
//!
//! C `unsigned` (without `short`/`char`) is 32-bit. Misreading `char_count` or
//! `pattern_size` as `u8` silently misaligns the 256-byte packed header.

use std::fs::File;
use std::io::Read;
use std::mem::size_of;
use std::path::Path;

use crate::error::FontError;
use crate::Result;

pub const CMEX_UFP_MAX_CHARS: usize = 8192;
pub const CMEX_UFP_DEFAULT_CODE_BANK_ID: u16 = 0x8001;
pub const CMEX_UFP_HEADER_SIZE: usize = 256;
pub const CMEX_FONT_INFO_SIZE: usize = 46;

/// On-disk glyph index entry (4 bytes); bitmap follows immediately in the file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CmexUfpCharIndex {
    pub code_bank_id: u16,
    pub code_lowbyte: u8,
    pub code_highbyte: u8,
}

impl CmexUfpCharIndex {
    pub fn big5_code(self) -> u16 {
        u16::from(self.code_highbyte) << 8 | u16::from(self.code_lowbyte)
    }
}

#[derive(Debug, Clone)]
pub struct CmexUfpChar {
    pub code_bank_id: u16,
    pub code_lowbyte: u8,
    pub code_highbyte: u8,
    pub bitmap: Vec<u8>,
}

impl CmexUfpChar {
    pub fn big5_code(&self) -> u16 {
        u16::from(self.code_highbyte) << 8 | u16::from(self.code_lowbyte)
    }
}

#[derive(Debug, Clone)]
pub struct CmexUfpHeader {
    pub header_size: u16,
    pub char_count: u32,
    pub char_width: u16,
    pub char_height: u16,
    pub pattern_size: u32,
}

#[derive(Debug, Clone)]
pub struct CmexUfpFile {
    pub header: CmexUfpHeader,
    pub chars: Vec<CmexUfpChar>,
}

impl CmexUfpFile {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let mut file = File::open(path)?;
        let mut header_bytes = [0u8; CMEX_UFP_HEADER_SIZE];
        file.read_exact(&mut header_bytes)?;

        debug_assert_eq!(header_bytes.len(), CMEX_UFP_HEADER_SIZE);

        if !header_bytes[2..10].starts_with(b"CMEX") {
            return Err(FontError::InvalidCmexSign.into());
        }

        let header = parse_cmex_header(&header_bytes)?;
        let pat = usize::try_from(header.pattern_size)
            .map_err(|_| FontError::BitmapSize {
                expected: 0,
                actual: header.pattern_size as usize,
            })?;

        let n = usize::try_from(header.char_count).unwrap_or(0);
        let mut chars = Vec::with_capacity(n);
        for _ in 0..n {
            let mut idx = [0u8; 4];
            file.read_exact(&mut idx)?;
            let code_bank_id = u16::from_le_bytes([idx[0], idx[1]]);
            let code_lowbyte = idx[2];
            let code_highbyte = idx[3];
            let mut bitmap = vec![0u8; pat];
            file.read_exact(&mut bitmap)?;
            chars.push(CmexUfpChar {
                code_bank_id,
                code_lowbyte,
                code_highbyte,
                bitmap,
            });
        }

        Ok(Self { header, chars })
    }
}

fn parse_cmex_header(buf: &[u8; CMEX_UFP_HEADER_SIZE]) -> Result<CmexUfpHeader> {
    const FONT_INFO_OFF: usize = 64;

    debug_assert_eq!(CMEX_FONT_INFO_SIZE, 46);
    debug_assert_eq!(buf.len(), CMEX_UFP_HEADER_SIZE);

    let header_size = u16::from_le_bytes([buf[0], buf[1]]);
    let char_count = u32::from_le_bytes([buf[12], buf[13], buf[14], buf[15]]);
    let char_width = u16::from_le_bytes([buf[16], buf[17]]);
    let char_height = u16::from_le_bytes([buf[18], buf[19]]);
    let pattern_size = u32::from_le_bytes([buf[20], buf[21], buf[22], buf[23]]);

    // font_info.char_define @ +22 from font_info start (u32)
    let char_define = u32::from_le_bytes([
        buf[FONT_INFO_OFF + 18],
        buf[FONT_INFO_OFF + 19],
        buf[FONT_INFO_OFF + 20],
        buf[FONT_INFO_OFF + 21],
    ]);
    let cell_width_max = u32::from_le_bytes([
        buf[FONT_INFO_OFF + 38],
        buf[FONT_INFO_OFF + 39],
        buf[FONT_INFO_OFF + 40],
        buf[FONT_INFO_OFF + 41],
    ]);
    let cell_height_max = u32::from_le_bytes([
        buf[FONT_INFO_OFF + 42],
        buf[FONT_INFO_OFF + 43],
        buf[FONT_INFO_OFF + 44],
        buf[FONT_INFO_OFF + 45],
    ]);

    let _ = (char_define, cell_width_max, cell_height_max, size_of::<CmexUfpCharIndex>());

    Ok(CmexUfpHeader {
        header_size,
        char_count,
        char_width,
        char_height,
        pattern_size,
    })
}
/// Parse the 256-byte CMEX header only (for tests and tooling).
pub fn parse_header_bytes(buf: &[u8; CMEX_UFP_HEADER_SIZE]) -> Result<CmexUfpHeader> {
    if !buf[2..10].starts_with(b"CMEX") {
        return Err(FontError::InvalidCmexSign.into());
    }
    parse_cmex_header(buf)
}
