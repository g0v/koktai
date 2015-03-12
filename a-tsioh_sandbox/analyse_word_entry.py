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

def parse_one(line):
    """
    analyse one line, assume unicode
    """
    matchs = re_main_parts.match(line)
    if matchs:
        entry = matchs.group("entry")
        entry = re_special_chars.sub("",entry)
        definition = matchs.group("definition")
        entry = convert_any(entry)
        definition = convert_any(definition)
        return (entry, definition)
    raise NameError('unparsable line: ' + line)





