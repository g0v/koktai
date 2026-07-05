//! CMEX: `char_count` and `pattern_size` are u32; empty `cmexufp.24m` does not exercise glyph bodies.

use koktai_font::cmexuf::{
    parse_header_bytes, CmexUfpChar, CmexUfpFile, CMEX_UFP_DEFAULT_CODE_BANK_ID,
    CMEX_UFP_HEADER_SIZE,
};

fn template_bytes() -> Option<[u8; CMEX_UFP_HEADER_SIZE]> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../font/hfn/cmexufp.24m");
    let data = std::fs::read(path).ok()?;
    let mut buf = [0u8; CMEX_UFP_HEADER_SIZE];
    buf.copy_from_slice(data.get(..CMEX_UFP_HEADER_SIZE)?);
    Some(buf)
}

#[test]
fn one_glyph_round_trip() {
    let Some(mut header) = template_bytes() else {
        return;
    };
    header[12..16].copy_from_slice(&1u32.to_le_bytes());
    let pat: u32 = 8;
    header[20..24].copy_from_slice(&pat.to_le_bytes());

    let mut body = Vec::new();
    body.extend_from_slice(&header);
    body.extend_from_slice(&[0x01, 0x80, 0x40, 0xFA]);
    body.extend_from_slice(&[0xAA; 8]);

    let tmp = tempfile::NamedTempFile::new().unwrap();
    std::fs::write(tmp.path(), &body).unwrap();

    let cmex = CmexUfpFile::open(tmp.path()).expect("open synthetic cmex");
    assert_eq!(cmex.header.char_count, 1);
    assert_eq!(cmex.header.pattern_size, 8);
    assert_eq!(cmex.chars.len(), 1);
    let c = &cmex.chars[0];
    assert_eq!(c.code_lowbyte, 0x40);
    assert_eq!(c.code_highbyte, 0xFA);
    assert_eq!(c.big5_code(), 0xFA40);
    assert_eq!(c.bitmap, vec![0xAA; 8]);
}

#[test]
fn char_count_298_not_truncated() {
    let Some(mut header) = template_bytes() else {
        return;
    };
    header[12..16].copy_from_slice(&298u32.to_le_bytes());
    let h = parse_header_bytes(&header).expect("parse header");
    assert_eq!(h.char_count, 298);
}

#[test]
fn cmex_index_lowbyte_before_highbyte() {
    let c = CmexUfpChar {
        code_bank_id: CMEX_UFP_DEFAULT_CODE_BANK_ID,
        code_lowbyte: 0x56,
        code_highbyte: 0xFA,
        bitmap: vec![],
    };
    assert_eq!(c.big5_code(), 0xFA56);
}