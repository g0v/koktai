# -*- coding: utf8 -*-
"""
This script convert the lines that correspond to words
ex:  
~t96;【~fb7bb1;八~fm3bb1;~fb7bb1;荒~fm3bb1;~fm3bb1;】~t84;[數帶名詞] (台)八/方荒遠丌~fk;~fm3;地/帶(/域)。 
"""

import sys
# from wsl_to_kaulo import convert_any
import re
import json
import os
import unicodedata as ud

re_main_parts = re.compile(r"^~t96;【(?P<entry>[^】]+)】~(fd6)?t84;(?P<definition>.*)$", re.I | re.U)

re_kai_font = re.compile(r"~fk;", re.I | re.U)
re_ming_font = re.compile(r"~fm3;", re.I | re.U)

re_change_font = re.compile(r"~fk[a-z0-9]*;(.*?)~fm[37][a-z0-9]*;", re.I | re.U)

re_special_chars = re.compile(r"~[a-z0-9]+(?:;|$)", re.I | re.U)

re_definition = re.compile(r"^(?P<nhomonym>[0-9]+ )?(?P<POS>\[[^\]]+\])?(?P<body>.*)$")

re_lang = re.compile(r"\((台|國語)\)", re.U)

re_zhuyin = re.compile(r"[\u3105-\u31ba]", re.U)


private_to_unicode = json.load(open(os.path.join(os.path.dirname(__file__), "..", "..", "a-tsioh_sandbox", "mapping.json")))
re_fk = re.compile(r"<k>.*?</k>", re.U)
def replace_privates(s):
    m = re_fk.search(s)
    while m:
        begin, end = m.span()
        new_content = "".join([ private_to_unicode[c] if c in private_to_unicode else c for c in s[begin:end]])
        s = s[:begin] + new_content + s[end:]
        m = re_fk.search(s,end)
    return s

def confirm_taigi(sentence):
    """
    Check if each sinogram in a sentence is
    followed by a zhuyin annotation
    """
    for i,char in enumerate(sentence[:-1]):
        try:
            if ud.name(char).startswith("CJK "):
                next_code = ord(sentence[i+1])
                if (not (next_code >= 0xf0000 and next_code <= 0xfffff)):
                    if not ud.name(sentence[i+1]).startswith("BOPOMOFO") and not sentence[i+1] in ("<",")"):
                        return False
        except:
            continue
    return True

def split_by_language(definition):
    sentences = []
    current_language = "國語"
    position = 0
    #m = re_lang.search(definition, position)
    chunks = definition.split("。")
    for i, sentence in enumerate(chunks):
        if len(sentence) ==0:
            continue
        if i < len(chunks) - 1:
            sentence += "。"
        if "(台)" in sentence[:5]:
            sentence = sentence.replace("(台)","",1)
            current_language = "台"
        if "(國語)" in sentence[:6]:
            sentence = sentence.replace("(國語)", "",1)
            current_language = "國語"
        if current_language == "台" and (not confirm_taigi(sentence)):
            current_language = "國語"
            #sentences.append({'lang': "國語", 'sentence': sentence})
        if len(sentences) >0 and sentences[-1]['lang'] == current_language:
            sentences[-1]['sentence'] += sentence
        else:
            sentences.append({'lang': current_language, 'sentence': sentence})
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
      h3 %(entry)s
      dl
        dd %(POS)s
    """.rstrip() % entry
       # dd %(nh)s
    for s in entry['sentences']:
        if True: #s['lang'] == "台":
            html += """
        dd
          u %s
            """.rstrip() % (s['lang'],)
        html += """
        dd %(sentence)s
        """.rstrip() % s
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
            for s in sentences:
                s['sentence'] = replace_privates(s['sentence'])
            e = {
                'entry': replace_privates(entry),
                'nh': nh,
                'POS': pos,
                'body': replace_privates(body),
                'sentences': sentences
                }
            return e

    #print >>sys.stderr, "pb with", line.encode('utf8')
    return None
    #raise NameError('unparsable line: ' + line)





