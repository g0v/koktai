# -*- coding: utf8 -*-
import os
from collections import namedtuple
import re
import json

#QUESTIONS:
# bb1, fd0
VERBOSE = True

def debug(x):
    if VERBOSE:
        print unicode(x).encode("utf8")

CHAPTER = u".章首" # header of a chapter, the following line contains a syllable in zhuyin
ENTRY = u".本文" # start and end of an entry ( one character + words)
#CHAR = u"~fm7t168"#bb1;" # char entry followed by char, zhuyin and 反切
#CHAR2 = u"~fkt168"#bb1;" # char entry followed by char, zhuyin and 反切
CHAR_PRE_RECODE_re = re.compile("^~(fm7|fk|fm3)t168")
CHAR_re = re.compile("^<CHAR/>")
READING = u"~fm7;" # various readings of a char (mandarin, various hokkien accents, wen/bai)

WORD = u"~t96;" # start of a Word entry (untill next empty line or ENTRY)
KIND = u"~fk;" # start of a (台)類語 line

Chapter = namedtuple('Chapter',"zhuyin pinyin content chars words")
Char = namedtuple('Char', "hanji details readings content words")
Word = namedtuple('Word', "content")

private_to_unicode = json.load(open(os.path.dirname(__file__) + "/mapping.json"))
m3_mapping = json.load(open(os.path.dirname(__file__) + "/m3.json"))
k_mapping = json.load(open(os.path.dirname(__file__) + "/k.json"))

re_fk = re.compile(ur"<k>.*?</k>", re.U)
re_change_font = re.compile(ur"~fk[a-z0-9]*;(.*?)~fm3[a-z0-9]*;",re.U)

def get_one_line(buffer):
    try:
        line = buffer.pop(0)
        #debug(line)
        return line
    except:
        return None


def match_apply(re, f, s):
    """
    apply f on every match of re in s
    """
    m = re.search(s)
    output = []
    while m is not None:
        #debug("all = " + s)
        (begin, end) = m.span()
        output.append(s[:begin])
        output.append(f(s[begin:end]))
        #debug("sub = " + output[-1])
        s = s[end:]
        m = re.search(s)
    output.append(s)
    return "".join(output)

k_re = re.compile(ur"<k>.*?<\/k>",re.U)
k1_re = re.compile(ur"[\U000fc6a1-\U000fc6a9]", re.U)
k2_re = re.compile(ur"[\U000F8000-\U000Fafff\U000FF000-\U000FFFFF]", re.U)
k3_re = re.compile(ur"[\U000F0000-\U000F7fff\U000Fb000-\U000FeFFF]", re.U)
k4_re = re.compile(ur"[\U000fc6a1-\U000fc6a9](?!</mark>)(?!</rt>)", re.U)
k5_re = re.compile(ur"[\U000Fc000-\U000Fcfff](?!</mark>)(?!</rt>)", re.U)
k6_re = re.compile(ur"[\U000F0000-\U000Fffff](?!</mark>)(?!</rt>)", re.U)
def recode(s):
    if CHAR_PRE_RECODE_re.match(s):
        s = "<CHAR/>" + s
    s = re_change_font.sub("<k>\\1</k>",s)
    def k1(s):
        return match_apply(k1_re, lambda x: unichr(0x245f + ord(x) - 0xfc6a0), s[3:-4]) # remove </k>
    def k2(s):
        def f(sub):
            code = "%04x" %(ord(sub) - 0xF0000,)
            if code in k_mapping:
                return "<rt>%s</rt>" % (k_mapping[code],)
            if sub in private_to_unicode:
                return private_to_unicode[sub]
            return "<mark>&#xf%s;</mark>" % (code,)
        return match_apply(k2_re, f, s)
    def k3(s):
        def f(sub):
            code = "%04x" % (ord(sub) - 0xF0000,)
            if code in k_mapping:
                return "<rt>%s</rt>" % (k_mapping[code],)
            if sub in private_to_unicode:
                return private_to_unicode[sub]
            return "<img src=\"img/k/%s.png\" />" % (sub,)
        return match_apply(k3_re, f, s)
    def k5(s):
        def f(sub):
            code = "%04x" %(ord(sub) - 0xF0000,)
            if code in m3_mapping:
                return m3_mapping[code]
            return "<img src=\"img/m3/%s.png\" />" % (code,)
        return match_apply(k5_re, f, s)
    def k6(s):
        def f(sub):
            code = "%04x" %(ord(sub) - 0xF0000,)
            if code in m3_mapping:
                return "<rt>%s</rt>" % (m3_mapping[code],)
            return "<img src=\"img/m3/%s.png\" />" % (code,)
        return match_apply(k6_re, f, s)

    s = match_apply(k_re, lambda x: k3(k2(k1(x))), s)
    s = match_apply(k4_re, lambda x: unichr(0x245f + ord(x) - 0xfc6a0), s)
    return k6(k5(s)).replace("</rt>/<rt>","/")


re_special_chars = re.compile(ur"~[a-z0-9]+;",re.U)
def remove_formatting_chars(s):
    return re_special_chars.sub("",s)
        


def parse_chapter(line, buffer):
    m = re.match(ur"^(.*)~t112(?:fd0)?;(\[[^\]]+\])?$", line.strip(), re.UNICODE)
    chp = Chapter(m.group(1), m.group(2),[], [], [])
    return chp

    
def parse_char_reading(line):
    m = re.match(ur"^~fm7;([^~]+)~fm3t42;　(.*)$", line)
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
    def merge_lines(lines):
        result = [""]
        while len(lines) != 0:
            l = lines.pop(0)
            if l != "":
                result[-1] += l
            else:
                result.extend(lines)
                lines = []
        return result
    re_main_parts = re.compile(ur"^【(?P<entry>[^】]+)】(?P<definition>.*)$",re.U)
    re_special_chars = re.compile(ur"~[a-z0-9]+;",re.U)
    re_definition = re.compile(ur"^(?P<nhomonym>[0-9]+ )?(?P<POS>\[[^\]]+\])?(?P<body>.*)$", re.DOTALL)

    lines = merge_lines(lines)
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
        def_matchs = re_definition.match(definition)
        if def_matchs:
            nh = def_matchs.group('nhomonym')
            if nh is None:
                nh = ''
            pos = def_matchs.group('POS')
            if pos is None:
                pos = ''
            body = def_matchs.group('body')
            body = replace_privates(body)
            e = {
                'entry': replace_privates(entry),
                'nh': nh,
                'POS': pos,
                'body': nh +" "+ pos + replace_privates(body),
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
    assert(CHAR_re.match(line))
    if "~fm3t84bb1;" in line:
        form, details = line.split("~fm3t84bb1;",1)
    elif "~fm3t84;" in line:
        form, details = line.split("~fm3t84;",1)
    elif "~t84" in line:
        form, details = line.split("~t84;",1)
    elif u"　" in line:
        form, details = line.split(u"　",1)
    else:
        form = line.strip()
        details = ""
    char = Char(form, details, [], [], [])
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
#        elif line.startswith(ENTRY) and current_section == "chapter":
#            assert get_one_line(buffer).strip() == ""
#            assert get_one_line(buffer).strip() == ENTRY
#            current_section = "char"
#            char = parse_char(get_one_line(buffer), buffer)
#            current_chpt.chars.append(char)
#            current_char = char
        #elif line.startswith(ENTRY) and current_section is None:
        elif CHAR_re.match(line):
            current_section = "char"
            current_char = parse_char(line, buffer)
            current_chpt.chars.append(current_char)
        elif line.startswith(READING):
            if not current_section == "char":
                debug("??? " + str(current_section) + " "+line)
                debug(current_chpt.zhuyin)
            else:
                current_char.readings.append(parse_char_reading(line))
        #elif line.startswith(ENTRY) and current_section in ("char","word"):
        #    current_section = None
        elif line.startswith(ENTRY):
            pass
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


def str_of_char(c):
    return (u"%s\n%s\n%s\n---" % ( c.hanji, c.details, "\n".join(["%s: %s"% r for r in c.readings]))).encode("utf8")

def str_of_word(w):
    return ("""
    %(entry)s %(nh)s. [%(POS)s]
    %(body)s
    ---
    """ % w).encode("utf8")



if __name__ == "__main__":
    import sys
    import codecs
    import pickle
    data = [recode(l.decode("utf8")) for l in sys.stdin.readlines()]
    result = parse(data)
    nc = 0
    nw = 0
    for chpt in result:
        for c in chpt.chars:
            #print str_of_char(c)
            nc += 1
            for w in c.words:
                #str_of_word(parse_one_word(w.content))
                nw += 1
    print nc, nw
    pickle.dump(result, open(sys.argv[1],"w"))
