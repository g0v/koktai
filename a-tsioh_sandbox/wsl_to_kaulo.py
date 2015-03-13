# -*- coding: utf8 -*-
"""
Conversion from WSL special codepoints (related to his font)
into church romanisation
"""

import codecs

data = {}

# load the reading data
with codecs.open("WSL_list.tsv","r","utf8") as f:
    f.readline() # discard headers
    for l in f:
        fields = l.strip().split('\t')
        data[fields[2]] = fields[0]


def check_entry(raw):
    # these chars have to be ignored
    raw = raw.replace('(',"").replace(')','').replace('/','').replace(u'·','')
    result = [(raw[0],[])] # list of (character, [list of romanisations])
    for i in range(1,len(raw)):
        syl = convert(raw[i])
        if syl == None :
            if len(result[-1][1]) == 0 :
                # unknown syllable
                result[-1][1].append(raw[i])
            else:
                # next sinogram
                result.append((raw[i],[]))
        else:
            # some reading for previous sinogram
            result[-1][1].append(raw[i])
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


