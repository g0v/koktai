# -*- coding: utf8 -*-
"""
Conversion from WSL special codepoints (related to his font)
into church romanisation
"""

import codecs
import unicodedata as ud

def is_CJK(c):
    try:
        if 'CJK' in ud.name(c):
            return True
        return False
    except:
        return False

data = {}

# load the reading data
with codecs.open("WSL_list.tsv","r","utf8") as f:
    f.readline() # discard headers
    for l in f:
        fields = l.strip().split('\t')
        data[fields[2]] = fields[0]


def check_entry(raw):
    # these chars have to be ignored
    raw = raw.replace('(',"").replace(')','').replace(u'·','').replace(u'…','').strip()
    result = [(raw[0],[])] # list of (character, [list of romanisations])
    i = 1
    while i < len(raw):
        if raw[i] == '/':
            #alternative
            i += 1
            if len(result[-1][1]) == 0:
                # alternative writting
                result[-1] = (result[-1][0] + "/" + raw[i], [])
            else:
                # alternative reading
                result[-1][1].append(raw[i])
        else:
            syl = convert(raw[i])
            if syl == None:
                if len(result[-1][1]) == 0 :
                    # still has to be some unknown syllable
                    result[-1][1].append(raw[i])
                else:
                    # next sinogram
                    result.append((raw[i],[]))
            else:
                # some reading for previous sinogram
                result[-1][1].append(raw[i])
        i += 1
    return result




def convert(syllable):
    """
    convert a single symbol
    """
    if syllable in data:
        return data[syllable]
    else:
        None

def convert_any(line):
    """
    convert any convertible symbol in a give string
    """
    result = []
    for c in line:
        if c in data:
            result.append(data[c])
        else:
            result.append(c)
    return "".join(result)


