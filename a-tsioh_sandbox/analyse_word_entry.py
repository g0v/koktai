# -*- coding: utf8 -*-
"""
This script convert the lines that correspond to words
ex:  
~t96;【~fb7bb1;八~fm3bb1;~fb7bb1;荒~fm3bb1;~fm3bb1;】~t84;[數帶名詞] (台)八/方荒遠丌~fk;~fm3;地/帶(/域)。 
"""

import sys
# from wsl_to_kaulo import convert_any
import re

re_main_parts = re.compile(ur"^~t96;【(?P<entry>[^】]+)】~t84;(?P<definition>.*)$",re.U)

re_kai_font = re.compile(ur"~fk;",re.U)
re_ming_font = re.compile(ur"~fm3;",re.U)

re_change_font = re.compile(ur"~fk;(.*?)~fm3;",re.U)

re_special_chars = re.compile(ur"~[a-z0-9]+;",re.U)

re_definition = re.compile(ur"^(?P<nhomonym>[0-9]+ )?(?P<POS>\[[^\]]+\])?(?P<body>.*)$")

re_lang = re.compile(ur"\((台|國語)\)",re.U)

def split_by_language(definition):
    sentences = []
    current_language = u"國語"
    position = 0
    m = re_lang.search(definition, position)
    while m:
        (begin, end) = m.span()
        sentences.append({'lang': current_language, 'sentence': definition[position:begin]})
        current_language = definition[begin+1:end-1]
        position = end
        m = re_lang.search(definition, position)
    sentences.append({'lang': current_language, 'sentence': definition[position:]})
    return sentences







def format_one(entry):
    return """
    %(entry)s [%(POS)s] (%(nh)s)
    %(body)s
    sentences:
    """ % entry + "\n".join(["\t%(lang)s : %(sentence)s" % x for x in entry['sentences']])


def html_of_entry(entry):
    html = """
    div
      h1 %(entry)s
      div.part-of-speech %(POS)s
      div.homonym %(nh)s
      div.definition
    """ % entry
    for s in entry['sentences']:
        html += """
          div.sentence
            div.lang %(lang)s
            div.text %(sentence)s
        """ % s
    return html
              
      

def parse_one(line):
    """
    analyse one line, assume unicode
    """
    matchs = re_main_parts.match(line)
    if matchs:
        entry = matchs.group("entry")
        definition = matchs.group("definition")
        # recode change font tags
        #entry = re_kai_font.sub("<k>",entry)
        #entry = re_ming_font.sub("</k>",entry)
        entry = re_change_font.sub("<k>\\1</k>",entry)
        definition = re_change_font.sub("<k>\\1</k>",definition)
        # remove formating chars (not sure of the meaning of each)
        entry = re_special_chars.sub("", entry)
        definition = re_special_chars.sub("", definition)
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
            sentences = split_by_language(body)
            #for s in sentences:
            #    if s['lang'] == u"台":
            #        s['sentence'] = convert_any(s['sentence'])
            e = {
                'entry': entry,
                'nh': nh,
                'POS': pos,
                'body': body,
                'sentences': sentences
                }
            return e

    #print >>sys.stderr, "pb with", line.encode('utf8')
    return None
    #raise NameError('unparsable line: ' + line)





