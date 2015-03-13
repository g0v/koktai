# -*- coding: utf8 -*-
"""
try to get as much data as possible from original .dic files
(cat-ed on stdin)
"""

import fileinput
from collections import defaultdict
import json

import analyse_word_entry
import wsl_to_kaulo

def main():
    i = 0
    good = defaultdict(set)
    bad = defaultdict(set)
    for line in fileinput.input():
        i += 1
        # not sure about the proper encoding to use
        try:
            line = line.decode('utf8')
            if line.startswith('~t96;'):
                # should be a word ?
                entry = analyse_word_entry.parse_one(line)
                print (analyse_word_entry.format_one(entry)).encode('utf8')
        except UnicodeDecodeError:
            print "encoding error on line", i

if __name__ == "__main__":
    main()

        



