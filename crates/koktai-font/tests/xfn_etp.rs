use std::io::BufReader;
use std::path::PathBuf;

use image::codecs::gif::GifDecoder;
use image::AnimationDecoder;
use koktai_font::tai::{TaiTypeface, XFN_TYPEFACE_MINGLIGHT};
use koktai_font::xfn::XfnFile;

fn font_etp() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../font/etp.xfn")
}

#[test]
fn etp_xfn_opens_and_has_chars() {
    let path = font_etp();
    if !path.exists() {
        return;
    }
    let xfn = XfnFile::open(&path).expect("open etp.xfn");
    assert!(xfn.header.number_of_char > 0);
    assert!(!xfn.index.is_empty());
}

#[test]
fn export_fab6_m3_gif() {
    let etp = font_etp();
    if !etp.exists() {
        return;
    }
    let dir = tempfile::tempdir().unwrap();
    let out_path = dir.path().join("fab6.gif");
    XfnFile::export_gif(&etp, XFN_TYPEFACE_MINGLIGHT, 0xFAB6, &out_path).expect("export");
    let meta = std::fs::metadata(&out_path).unwrap();
    assert!(meta.len() > 32);

    let f = BufReader::new(std::fs::File::open(&out_path).unwrap());
    let decoder = GifDecoder::new(f).expect("decode gif");
    let frames = decoder.into_frames().collect_frames().expect("frames");
    let frame = &frames[0];
    let has_transparent = frame.buffer().pixels().any(|p| p[3] == 0);
    assert!(
        has_transparent,
        "GIF background must be transparent (legacy gd white transparency)"
    );
    let _ = TaiTypeface::MingLight;
}