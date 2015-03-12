# -*- coding: utf8 -*-
"""
try to get as much data as possible from original .dic files
(cat-ed on stdin)
"""

import fileinput

import analyse_word_entry

def main():
    i = 0
    for line in fileinput.input():
        i += 1
        # not sure about the proper encoding to use
        try:
            line = line.decode('utf8')
            if line.startswith('~t96;'):
                # should be a word ?
                print analyse_word_entry.format_one(analyse_word_entry.parse_one(line)).encode('utf8')
                print "----"
        except UnicodeDecodeError:
            print "encoding error on line", i

if __name__ == "__main__":
    main()

        



