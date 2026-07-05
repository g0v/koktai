use thiserror::Error;

#[derive(Debug, Error)]
pub enum FontError {
    #[error("invalid XFN magic id")]
    InvalidXfnId,
    #[error("invalid CMEX user-font sign")]
    InvalidCmexSign,
    #[error("glyph not found: typeface={typeface} code={code:04X}")]
    GlyphNotFound { typeface: u8, code: u16 },
    #[error("bitmap size mismatch: expected {expected}, got {actual}")]
    BitmapSize { expected: usize, actual: usize },
    #[error("unsupported typeface string: {0}")]
    UnknownTypeface(String),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}