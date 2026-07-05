//! CMEX user-font (cmexuf) and XFN font formats from the Koktai `font/hfn/` toolchain.

pub mod bitmap;
pub mod cmexuf;
pub mod error;
pub mod io_ext;
pub mod tai;
pub mod xfn;

pub use cmexuf::{CmexUfpChar, CmexUfpFile};
pub use xfn::{XfnChar, XfnFile};

/// Project-wide result alias; override `E` when a caller needs a precise error type.
pub type Result<T, E = anyhow::Error> = std::result::Result<T, E>;