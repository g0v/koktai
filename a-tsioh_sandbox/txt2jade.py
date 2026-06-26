# -*- coding: utf8 -*-
"""
simple html embedding for original .txt files
(cat-ed on stdin)
"""
import sys
import fileinput

import analyse_word_entry as AWE

def format_one(line):
    return "      " + line

def parse_one(lines):
    print """    p(style="white-space: pre-wrap; font-family: monospace; font-size: 1rem")."""
    for l in lines:
        l = AWE.re_change_font.sub("<k>\\1</k>",l)
        l = AWE.re_special_chars.sub("", l)
        l = AWE.replace_privates(l).strip()
        print format_one(l).encode("utf8")
    if len(lines) <= 1:
        print ""

def main():
    print """
doctype html
html
  head
    meta(charset='utf8')
  body
"""
    i = 0
    buf = []
    inside = False
    for line in fileinput.input():
        i += 1
        # not sure about the proper encoding to use
        # Perl actually does a better job on this, original encoding is CP950
        try:
            line = line.decode('utf8').strip()
            if line.lstrip():
                buf.append(line)
            elif len(buf)>0:
                parse_one(buf)
                buf = []

        except UnicodeDecodeError:
            print >>sys.stderr,"encoding error on line", i
    if len(buf)>0:
        parse_one(buf)

if __name__ == "__main__":
    main()
