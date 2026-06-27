#! /usr/bin/env python3
"""
This script generates the glyph image of all mapped Big5 codepoints, in the GIF format.
It references the JSON files which map private-use Big5 codepoints to Unicode characters.
The Unicode characters is included in the filename of the generated GIF image.
In this way, when one is in the thumbnails view in the file manager, it is easy to check whether the mapping is correct.
ex:
c6d6 remapped to 辵 (m3 font, not Bomopofo ruby): output is m3_noruby/c6d6.辵.GIF
"""

import json
import os
import subprocess
import unicodedata

fontdir = os.path.dirname(__file__)

maps = []
for path in ["/k.json", "/../a-tsioh_sandbox/mapping.json", "/m3.json", "/m3_noruby.json"]:
    with open(fontdir + path, encoding="utf-8-sig") as f:
        maps.append(json.load(f))

k_map, k_noruby_map, m3_map, m3_noruby_map = maps

def char_to_strcode(ch):
    return "%04x" % (ord(ch) - 0xF0000,)

safe_fname_table = str.maketrans({
    "\\": "＼",
    "/": "／",
    ":": "：",
    "*": "＊",
    "?": "？",
    '"': "＂",
    "<": "＜",
    ">": "＞",
    "|": "｜",
})
def safe_fname(fname):
    return fname.translate(safe_fname_table)

def to_font_gif(font, mapname, strcode):
    mapdir = fontdir + "/" + mapname
    os.makedirs(mapdir, exist_ok=True)
    fontfile = mapdir + "/%s.%s.GIF" % (strcode, safe_fname(str_))
    if not os.path.exists(fontfile):
        print("\r" + fontfile, end="")
        subprocess.run([fontdir + "/hfn/xfn2gif", "-i", fontdir + "/etp.xfn",
            "-o", fontfile, "-t", font, "-c", strcode],
            timeout=None)

for (k, str_) in k_map.items():
    to_font_gif("k", "k_ruby", k)

for (k, str_) in k_noruby_map.items():
    if all(("CJK UNIFIED IDEOGRAPH" in unicodedata.name(ch) for ch in str_)):
        to_font_gif("k", "k_cjkv", char_to_strcode(k))
    else:
        to_font_gif("k", "k_noruby", char_to_strcode(k))

for (m3, str_) in m3_map.items():
    to_font_gif("m3", "m3_ruby", m3)

for (m3, str_) in m3_noruby_map.items():
    to_font_gif("m3", "m3_noruby", m3)

print()
