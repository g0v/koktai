# -*- coding: utf8 -*-
"""
This script convert the lines that correspond to characters
ex:  
~fm7t168bb1;八~fm3t168bb1;<U+FFAB6>~fm3t84bb1;　布拔切，黠韻

~fm7;國音~fm3t42;　~t84;<U+FFAB6>，下一字為去聲時自然連讀變音為「
<U+FFAB7>」，否則不成詞~bt315;∥~bt0;
~fm7;台甘~fm3t42;　~t84;(文)<U+FFB49>(語)<U+FFAE5>(漳)<U+FFBF0>(廈、泉)~bt315;∥~bt0;
~fm7;普閩~fm3t42;　~t84;(文)<U+FFB49>(白)<U+FFBF0>。
    
"""

import sys
# from wsl_to_kaulo import convert_any
import re
import json
import os
import fileinput


import analyse_word_entry as AWE

def parse_one(lines):
    for l in lines:
        l = AWE.re_change_font.sub("<k>\\1</k>",l)
        l = AWE.re_special_chars.sub("", l)
        l = AWE.replace_privates(l)
        #if l.startswith(u"台甘") or l.startswith(u"普閩"):
        #    l = "".join([AWE.private_to_unicode[c] if c in AWE.private_to_unicode else c for c in l])
        print l.encode("utf8")
    print ""


buf = []
inside = False

for l in fileinput.input():
    l = l.decode("utf8").strip()
    if l == "":
        continue
    if inside:
        if l.startswith("~fm7;"):
            buf.append(l)
        else:
            parse_one(buf)
            buf = []
            inside = False
    if not inside:
        if l.startswith("~fm7t168bb1;"):
            buf = [l]
            inside = True







