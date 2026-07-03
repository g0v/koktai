#! /usr/bin/env python3
"""
This script renames the glyph GIF images in a directory to strip the non-code part from the filename
"""

import os
import re
import sys

if __name__ == "__main__":
    s_dir = sys.argv[1]
    sources = [os.path.join(s_dir, p) for p in os.listdir(s_dir) if p.endswith(".GIF")]
    for s in sources:
        fname = os.path.basename(s)
        new_fname = re.sub(r"\..*$", ".GIF", fname)
        if new_fname != fname:
            os.rename(s, os.path.join(s_dir, new_fname))
