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


def convert(syllable):
    """
    convert a single symbol
    """
    if syllable in data:
        return data[syllable]
    else:
        raise NameError(syllable +" unknown")

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


