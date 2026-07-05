//! TAI / XFN / CMEX typeface mapping (port of `tai.c` + `convert.c`).

use crate::error::FontError;
use crate::Result;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaiTypeface {
    Ming = 0,
    Kai,
    Round,
    Black,
    Li,
    Shing,
    Fonsung,
    MingLight,
    MingBold,
    BlackBold,
    Symbol,
}

pub const XFN_TYPEFACE_MING: u8 = 0;
pub const XFN_TYPEFACE_KAI: u8 = 1;
pub const XFN_TYPEFACE_MINGLIGHT: u8 = 7;

pub fn tai_typeface_from_cli(s: &str) -> Result<TaiTypeface> {
    match s {
        "m" => Ok(TaiTypeface::Ming),
        "k" => Ok(TaiTypeface::Kai),
        "m3" => Ok(TaiTypeface::MingLight),
        other => Err(FontError::UnknownTypeface(other.to_string()).into()),
    }
}

pub fn tai_to_xfn(t: TaiTypeface) -> Result<u8> {
    Ok(match t {
        TaiTypeface::Ming => XFN_TYPEFACE_MING,
        TaiTypeface::Kai => XFN_TYPEFACE_KAI,
        TaiTypeface::MingLight => XFN_TYPEFACE_MINGLIGHT,
        _ => return Err(FontError::UnknownTypeface(format!("{t:?}")).into()),
    })
}