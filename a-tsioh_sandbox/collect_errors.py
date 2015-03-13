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
                syl_list = wsl_to_kaulo.check_entry(entry['raw']) 
                for sino, readings in syl_list:
                    for r in readings:
                        syl = wsl_to_kaulo.convert(r)
                        if syl is not None:
                            good[sino].add(syl)
                        else:
                            bad[sino].add(r)
        except UnicodeDecodeError:
            print "encoding error on line", i

    # let's build a reverse index of problems
    readings_dic = defaultdict(list)
    for sino, readings in bad.iteritems():
        for r in readings:
            readings_dic[r].append(sino)
    for k,v in good.items():
        good[k] = list(v)
    for k,v in bad.items():
        bad[k] = list(v)
    print json.dumps((readings_dic, good, bad))

if __name__ == "__main__":
    main()

        



