//! Export one glyph from an XFN font to GIF (replacement for `font/hfn/xfn2gif`).

use std::path::PathBuf;

use clap::Parser;
use koktai_font::tai::{tai_to_xfn, tai_typeface_from_cli};
use koktai_font::xfn::XfnFile;

#[derive(Parser)]
#[command(
    name = "xfn2gif",
    about = "Export XFN font glyph to GIF",
    verbatim_doc_comment
)]
struct Args {
    /// Input `.xfn` file
    #[arg(short = 'i')]
    input: PathBuf,
    /// Output `.gif` file
    #[arg(short = 'o')]
    output: PathBuf,
    /// Typeface: m, k, or m3
    #[arg(short = 't')]
    typeface: String,
    /// Big5 code as hex (e.g. fab6)
    #[arg(short = 'c', value_parser = parse_hex_code)]
    code: u16,
}

fn parse_hex_code(s: &str) -> Result<u16, String> {
    u16::from_str_radix(s, 16).map_err(|e| e.to_string())
}

fn main() -> koktai_font::Result<()> {
    let args = Args::parse();
    let tai = tai_typeface_from_cli(&args.typeface)?;
    let xfn_tf = tai_to_xfn(tai)?;
    XfnFile::export_gif(&args.input, xfn_tf, args.code, &args.output)?;
    Ok(())
}