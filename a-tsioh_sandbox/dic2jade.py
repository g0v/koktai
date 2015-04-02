# -*- coding: utf8 -*-
"""
try to get as much data as possible from original .dic files
(cat-ed on stdin)
"""
import sys
import fileinput
from collections import defaultdict
import json

import analyse_word_entry
#import wsl_to_kaulo

def process_buffer(buf):
    entry = analyse_word_entry.parse_one("".join(buf))
    if entry:
        return (analyse_word_entry.html_of_entry(entry)).encode('utf8')
    else:
        return "".join(buf).encode("utf8")

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
            if line.startswith('~t96;'): 
                # new word
                if len(buf)>0:
                    print process_buffer(buf)
                buf = [line]
                inside = True
            elif line.startswith(u".本文"):
                if len(buf)>0:
                    print process_buffer(buf)
                buf = []
                inside = False
            elif inside:
                buf.append(line)


        except UnicodeDecodeError:
            print >>sys.stderr,"encoding error on line", i
    if len(buf)>0:
        print process_buffer(buf)

if __name__ == "__main__":
    main()

        



