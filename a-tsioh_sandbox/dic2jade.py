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
import wsl_to_kaulo

def main():
    print """
doctype html
html
  head 
    meta(charset='utf8')
  body
    """
        
    i = 0
    for line in fileinput.input():
        i += 1
        # not sure about the proper encoding to use
        # Perl actually does a better job on this, original encoding is CP950
        try:
            line = line.decode('utf8')
            if line.startswith('~t96;'):
                # should be a word ?
                entry = analyse_word_entry.parse_one(line)
                if entry:
                    print (analyse_word_entry.html_of_entry(entry)).encode('utf8')
        except UnicodeDecodeError:
            print >>sys.stderr,"encoding error on line", i

if __name__ == "__main__":
    main()

        


