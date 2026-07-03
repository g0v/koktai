#! /usr/bin/env python3
"""
This script generates the glyph image of missing <img> references, in the GIF format.
"""

import glob
import os
import re
from maps_to_gif import k_map, k_noruby_map, m3_map, m3_noruby_map, expand_inner_m3, to_font_gif

fontdir = os.path.dirname(__file__)

if __name__ == "__main__":
    codes = set()
    for file in glob.glob(fontdir + "/../html/*.html"):
        for line in open(file, encoding="utf-8-sig"):
            for match in re.finditer(r'<img src="img/(k|m3)/([a-f0-9]+)\.png">', line):
                if not os.path.isfile(fontdir + "/../img/%s/%s.png" % (match.group(1), match.group(2))):
                    codes.add((match.group(1), match.group(2)))

    for (font, strcode) in codes:
        if font == "k":
            to_font_gif("k", "k_missing", strcode, expand_inner_m3(k_noruby_map.get(strcode, k_map.get(strcode, ""))))
        elif font == "m3":
            to_font_gif("m3", "m3_missing", strcode, m3_noruby_map.get(strcode, expand_inner_m3(m3_map.get(strcode, ""))))

    print()
