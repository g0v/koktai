# -*- coding: utf8 -*-
"""
This script convert the lines that correspond to words
ex:  
~t96;【~fb7bb1;八~fm3bb1;~fb7bb1;荒~fm3bb1;~fm3bb1;】~t84;[數帶名詞] (台)八/方荒遠丌~fk;~fm3;地/帶(/域)。 
"""

from wsl_to_kaulo import convert_any
import re

re_main_parts = re.compile(ur"^~t96;【(?P<entry>[^】]+)】~t84;(?P<definition>.*)$",re.U)
re_special_chars = re.compile(ur"~[a-z0-9]+;")

re_definition = re.compile(ur"^(?P<nhomonym>[0-9]+ )?(?P<POS>\[[^\]]+\])?(?P<body>.*)$")

def format_one(entry):
    return """
    %(entry)s [%(POS)s] (%(nh)s)
    %(body)s
    """ % entry

def parse_one(line):
    """
    analyse one line, assume unicode
    """
    matchs = re_main_parts.match(line)
    if matchs:
        entry = matchs.group("entry")
        definition = matchs.group("definition")
        # remove formating chars (not sure of the meaning of each)
        entry = re_special_chars.sub("", entry)
        tmp = entry
        definition = re_special_chars.sub("", definition)
        # romanise the phonetics
        entry = convert_any(entry)
        definition = convert_any(definition)

        # analyse def content
        def_matchs = re_definition.match(definition)
        if def_matchs:
            nh = def_matchs.group('nhomonym')
            if nh is None:
                nh = '1'
            pos = def_matchs.group('POS')
            if pos is None:
                pos = 'None'
            body = def_matchs.group('body')
            e = {
                'raw': tmp,
                'entry': entry,
                'nh': nh,
                'POS': pos,
                'body': body
                }
            return e

    print "pb with", line.encode('utf8')
    return None
    #raise NameError('unparsable line: ' + line)





