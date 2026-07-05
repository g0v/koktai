use std::path::PathBuf;

use koktai_font::cmexuf::{CmexUfpFile, CMEX_UFP_HEADER_SIZE};

fn template_24m() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../font/hfn/cmexufp.24m")
}

#[test]
fn cmex_24m_template_is_header_only() {
    let path = template_24m();
    if !path.exists() {
        return;
    }
    let len = std::fs::metadata(&path).unwrap().len();
    assert_eq!(len as usize, CMEX_UFP_HEADER_SIZE);
}

#[test]
fn cmex_24m_template_opens() {
    let path = template_24m();
    if !path.exists() {
        return;
    }
    let cmex = CmexUfpFile::open(&path).expect("open cmex template");
    assert_eq!(cmex.header.char_width, 24);
    assert_eq!(cmex.header.char_height, 24);
    assert_eq!(cmex.header.pattern_size, 72);
    assert_eq!(cmex.header.char_count, 0);
    assert!(cmex.chars.is_empty());
}