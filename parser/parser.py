# -*- coding: utf8 -*-
import os
from collections import namedtuple
import re
import json


VERBOSE = True

def debug(x):
    if VERBOSE:
        print unicode(x).encode("utf8")

CHAPTER = u".章首" # header of a chapter, the following line contains a syllable in zhuyin
ENTRY = u".本文" # start and end of an entry ( one character + words)
CHAR = u"~fm7t168bb1;" # char entry followed by char, zhuyin and 反切
CHAR2 = u"~fkt168bb1;" # char entry followed by char, zhuyin and 反切
READING = u"~fm7;" # various readings of a char (mandarin, various hokkien accents, wen/bai)

WORD = u"~t96;" # start of a Word entry (untill next empty line or ENTRY)
KIND = u"~fk;" # start of a (台)類語 line

Chapter = namedtuple('Chapter',"zhuyin pinyin content chars words")
Char = namedtuple('Char', "hanji details readings content words")
Word = namedtuple('Word', "content")


private_to_unicode = json.load(open(os.path.dirname(__file__) + "/mapping.json"))
re_fk = re.compile(ur"<k>.*?</k>", re.U)
re_change_font = re.compile(ur"~fk[a-z0-9]*;(.*?)~fm3[a-z0-9]*;",re.U)

def get_one_line(buffer):
    try:
        return buffer.pop(0)
    except:
        return None


def parse_chapter(line, buffer):
    m = re.match(ur"^(.*)~t112fd0;\[(.*)\]", line, re.UNICODE)
    chp = Chapter(m.group(1), m.group(2),[], [], [])
    return chp

    
def parse_char_reading(line):
    m = re.match(ur"^~fm7;([^~]+)~fm3t42;　~t84;(.*)$", line)
    return (m.group(1),m.group(2))


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
    for i,char in enumerate(unicode(sentence)[:-1]):
        try:
            if ud.name(char).startswith("CJK "):
                next_code = ord(sentence[i+1])
                if (not (next_code >= 0xf0000 and next_code <= 0xfffff)):
                    if not ud.name(sentence[i+1]).startswith("BOPOMOFO") and not sentence[i+1] in ("<",")"):
                        return False
        except:
            continue
    return True

def parse_one_word(lines):
    """
    analyse one line, assume unicode
    """
    re_main_parts = re.compile(ur"^~t96;【(?P<entry>[^】]+)】~(fd6)?t84;(?P<definition>.*)$",re.U)
    re_special_chars = re.compile(ur"~[a-z0-9]+;",re.U)
    re_definition = re.compile(ur"^(?P<nhomonym>[0-9]+ )?(?P<POS>\[[^\]]+\])?(?P<body>.*)$", re.DOTALL)

    matchs = re_main_parts.match(lines[0])
    if matchs:
        entry = matchs.group("entry")
        definition = "\n".join([matchs.group("definition")] + lines[1:]) 
        entry = re_change_font.sub("<k>\\1</k>",entry)
        definition = re_change_font.sub("<k>\\1</k>",definition)
        # remove formating chars (not sure of the meaning of each)
        # entry = re_special_chars.sub("", entry)
        # definition = re_special_chars.sub("", definition)
        # analyse def content
        print definition.encode("utf8")
        def_matchs = re_definition.match(definition)
        if def_matchs:
            nh = def_matchs.group('nhomonym')
            if nh is None:
                nh = '1'
            pos = def_matchs.group('POS')
            if pos is None:
                pos = 'None'
            body = def_matchs.group('body')
            body = replace_privates(body)
            e = {
                'entry': replace_privates(entry),
                'nh': nh,
                'POS': pos,
                'body': replace_privates(body),
                }
            return e
        print "PB"
        debug(definition)
    print "PB"
    debug(lines[0])



def parse_words(buffer):
    results = []
    tmp = ""
    def process(definition):
        results.append(parse_one_word(definition.replace("\n","")))
    line = get_one_line(buffer)
    while not line.startswith(ENTRY):
        if line.startswith(WORD):
            tmp = line
        elif line.strip() == "":
            process(tmp)
            tmp = ""
        else:
            tmp += line
        line = get_one_line(buffer)
    if tmp != "":
        process(tmp)
    return results



def parse_char(line, buffer):
    assert(line.startswith(CHAR) or line.startswith(CHAR2))
    form, details = line.split("~fm3t84bb1;",1)
    char = Char(form.replace(CHAR,"").replace(CHAR2,""), details, [], [], [])
    return char


def parse(buffer):
    results = []
    current_chpt = None
    current_char = None
    current_word = None
    current_section = None
    line = get_one_line(buffer)
    while line is not None:
        line = line.strip()
        if line.startswith(CHAPTER):
            current_chpt = parse_chapter(get_one_line(buffer), buffer)
            results.append(current_chpt)
            current_section = "chapter"
            current_char = None
        elif line.startswith(ENTRY) and current_section == "chapter":
            assert get_one_line(buffer).strip() == ""
            assert get_one_line(buffer).strip() == ENTRY
            current_section = "char"
            char = parse_char(get_one_line(buffer), buffer)
            current_chpt.chars.append(char)
            current_char = char
        elif line.startswith(ENTRY) and current_section is None:
            current_section = "char"
            current_char = parse_char(get_one_line(buffer), buffer)
            current_chpt.chars.append(current_char)
        elif line.startswith(READING):
            if not current_section == "char":
                debug("??? " + str(current_section) + " "+line)
            current_char.readings.append(parse_char_reading(line))
        elif line.startswith(ENTRY) and current_section in ("char","word"):
            current_section = None
        elif line.startswith(WORD):
            current_word = Word([line])
            if current_char is not None:
                current_char.words.append(current_word)
            else:
                current_chpt.words.append(current_word)
            current_section = "word"
        else:
            if current_section == "chapter":
                current_chpt.content.append(line)
            elif current_section == "char":
                current_char.content.append(line)
            elif current_section == "word":
                current_word.content.append(line)
            else:
                if not line.strip() == "":
                    debug("what should we do with: " + line)
        line = get_one_line(buffer)
    return results


if __name__ == "__main__":
    import sys
    import codecs
    import pickle
    data = [l.decode("utf8") for l in sys.stdin.readlines()]
    result = parse(data)
    for c in result[0].chars:
        for w in c.words:
            print "\n".join(w.content)
            print parse_one_word(w.content)
            print "----"
    #pickle.dump(parse(data), open(sys.argv[1],"w"))
