# -*- coding: utf8 -*-
"""
try to get as much data as possible from original .dic files
(cat-ed on stdin)
"""
import sys
import fileinput
from collections import defaultdict
import json

import analyse_chapter
import analyse_word_entry
#import wsl_to_kaulo

def process_buffer(buf,list_of_results,inside):
    if inside == 'chapter':
        entry = analyse_chapter.parse_one("".join(buf))
        if entry:
            list_of_results.append({'entry':entry['entry'], 'chapter':entry})
        else:
            print "unanalyzed chapter", "".join(buf).encode("utf8")
    elif inside == 'word':
        entry = analyse_word_entry.parse_one("".join(buf))
        if entry:
            if len(list_of_results) > 0 and list_of_results[-1]['entry'] == entry['entry']:
                list_of_results[-1]['heteronyms'].append(entry)
            else:
                list_of_results.append({'entry':entry['entry'], 'heteronyms':[entry]})
        else:
            print "unanalyzed word", "".join(buf).encode("utf8")
    else:
        print "unanalyzed", "".join(buf).encode("utf8")

def print_results(list_of_results):
    for entry in list_of_results:
        if 'chapter' in entry:
            print analyse_chapter.html_of_entry(entry['chapter']).encode("utf8")
        else:
            for h in entry['heteronyms']:
                print analyse_word_entry.html_of_entry(h).encode("utf8")
def main():
    print """
doctype html
html
  head 
    meta(charset='utf8')
  body
    """
    lor = []        
    i = 0
    buf = []
    inside = None
    for line in fileinput.input():
        i += 1
        # not sure about the proper encoding to use
        # Perl actually does a better job on this, original encoding is CP950
        try:
            line = line.decode('utf8').strip()
            if line.startswith(u".章首"):
                # new chapter
                if len(buf)>0:
                    process_buffer(buf, lor, inside)
                buf = []
                inside = 'chapter'
            elif line.startswith('~t96;'):
                # new word
                if len(buf)>0:
                    process_buffer(buf, lor, inside)
                buf = [line]
                inside = 'word'
            elif line.startswith(u".本文"):
                if len(buf)>0:
                    process_buffer(buf, lor, inside)
                buf = []
                inside = None
            elif inside:
                buf.append(line)


        except UnicodeDecodeError:
            print >>sys.stderr,"encoding error on line", i
    if len(buf)>0:
        process_buffer(buf,lor,inside)
    print_results(lor)

if __name__ == "__main__":
    main()

        



