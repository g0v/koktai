//! CMEX user-font (cmexuf) and XFN font formats from the Koktai `archive/font-hfn-c/` toolchain.

pub mod bitmap;
pub mod cmexuf;
pub mod error;
pub mod io_ext;
pub mod tai;
pub mod xfn;

pub type Result<T, E = anyhow::Error> = std::result::Result<T, E>;