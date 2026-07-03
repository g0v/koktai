# -*- coding: utf8 -*-
"""
This script convert the lines that correspond to chapters
ex:  
ㄅ�掁提� ~t112fd0;[binˇ]


按：與台語「�獺v音對應的「�情v音，國語多作「�瓷v。可能因讀「�情v的上聲字只有「稟/稟」字，結果被許多「�瓷v音字同化了。
"""

import sys
# from wsl_to_kaulo import convert_any
import re
import json
import os
import unicodedata as ud
from analyse_word_entry import re_change_font, re_special_chars, replace_privates

re_main_parts = re.compile(ur"^(?P<entry>.*)~t112(?:fd0)?;(?P<zhuyin2>\[[^\]]+\])?(?P<body>.*)$",re.U|re.I)

def format_one(entry):
    return """
    %(entry)s %(zhuyin2)s
    %(body)s
    notes:
    """ % entry + "\n".join(["\t%(notes)s" % x for x in entry['notes']])


def html_of_entry(entry):
    html = """
    div
      h2 %(entry)s %(zhuyin2)s
    """.rstrip() % entry
    for s in entry['notes']:
        html += u"""
      dd %s
        """.rstrip() % s
    return html
              
      

def parse_one(line):
    """
    analyse one line, assume unicode
    """
    matchs = re_main_parts.match(line)
    if matchs:
        entry = matchs.group("entry")
        zhuyin2 = matchs.group("zhuyin2") or ""
        body = matchs.group("body")
        entry = re_change_font.sub("<k>\\1</k>",entry)
        zhuyin2 = re_change_font.sub("<k>\\1</k>",zhuyin2)
        body = re_change_font.sub("<k>\\1</k>",body)
        # remove formating chars (not sure of the meaning of each)
        entry = re_special_chars.sub("", entry)
        zhuyin2 = re_special_chars.sub("", zhuyin2)
        body = re_special_chars.sub("", body)
        notes = body.splitlines() if body else []
        for i, s in enumerate(notes):
            notes[i] = replace_privates(s).strip()
        e = {
            'entry': replace_privates(entry),
            'zhuyin2': replace_privates(zhuyin2),
            'body': replace_privates(body),
            'notes': notes
            }
        return e

    #print >>sys.stderr, "pb with", line.encode('utf8')
    return None
    #raise NameError('unparsable line: ' + line)





