# -*- coding: utf8 -*-

import py2neo
import pickle
import re

from parser import Chapter, Char, Word, parse_one_word, remove_formatting_chars

GRAPH = py2neo.Graph()

re_zhuyin = re.compile("<rt>.*?</rt>")
def remove_zhuyin(s):
    return re_zhuyin.sub("",s)

def correct_chapters(s):
    mapping = {'8ed5': u'\u3127',
 'fa4e': u'\u312b',
 'fa6a': u'\u3120',
 'fa6f': u'\u31ac',
 'fa71': u'\u3122',
 'fa72.': u'\u3123',
 'fa76': u'\u31ad',
 'faa5': u'\u31b6'}
    for k,v in mapping.items():
        img = "<img src=\"img/m3/%s.png\" />" % (k)
        s = s.replace(img, v)
    return s

def encode_dict(d):
    for k,v in d.items():
        if type(v) is unicode:
            d[k] = remove_formatting_chars(v)
    return d


chpt_id = 0
def extract_chapter_props(chpt):
    global chpt_id
    chpt_id += 1
    return encode_dict({u"SID": u"Koktai-chpt-%s-%s-%d" %(chpt.zhuyin, chpt.pinyin,chpt_id),
            u"label": correct_chapters(chpt.zhuyin), 
            u"注音": correct_chapters(chpt.zhuyin),
            u"pinyin": chpt.pinyin,
            u"本文": u"".join(chpt.content)})

char_id = 0
def extract_char_props(char):
    global char_id
    char_id += 1
    return encode_dict({u"SID": u"Koktai-char-%s-%d" %(char.hanji, char_id),
            u"label": char.hanji.replace("<CHAR/>",""),
            u"字": unicode(char.hanji.replace("<CHAR/>","")),
            u"反切": unicode(char.details),
            u"本文": u"".join(char.content)})

reading_id = 0
def extract_reading_props(cid, r):
    global reading_id
    reading_id += 1
    return encode_dict({u"SID": "Koktai-reading-%s-%s-%s-%d" % (cid, r[0],r[1], reading_id),
        u"label": r[1].replace("<rt>","").replace("</rt>", ""),
        u"參考書": r[0],
             u"本文": r[1]})

word_id = 0
def extract_word_props(word):
    global word_id
    word_id += 1
    w = parse_one_word([remove_formatting_chars(l) for l in word.content])
    return {u"SID": u"Koktai-word-%s-%d" % (w['entry'], word_id),
            u"label": remove_zhuyin(w['entry']),
            u"項": w['entry'],
            u"nhyp": w['nh'],
            u"詞類": w["POS"],
            u"本文": w["body"]}

def create_reading(tx, char_ID, reading, order):
    req = u"""
    MATCH (char:字:Koktai {SID:{id}})
    CREATE (im:音:Koktai)
    SET im = {props}
    CREATE (char) -[:唸]-> (im)
    """
    props = extract_reading_props(char_ID, reading)
    props["order"] = order
    tx.append(req, {"props":props, "id": char_ID})



def create_word(tx, char_ID, word):
    req = u"""
    MATCH (char:字:Koktai {SID:{id}})
    CREATE (w:詞:Koktai)
    SET w = {props}
    CREATE (char) -[:屬於]-> (w)
    """
    props = extract_word_props(word)
    props["order"] = word_id 
    tx.append(req, {"props":props, "id": char_ID})



def create_char(tx, chpt_ID, char):
    req = u"""
    MATCH (chpt:章:Koktai {SID:{id}})
    CREATE (ji:字:Koktai)
    SET ji = {props}
    CREATE (chpt) -[r:含]-> (ji)
    """
    props = extract_char_props(char)
    props["order"] = char_id
    tx.append(req, {"props":props, "id": unicode(chpt_ID)})
    for i, r in enumerate(char.readings):
        create_reading(tx, props["SID"], r, i)
    for w in char.words:
        create_word(tx, props["SID"], w)


def create_chapter(tx, chpt):
    req = u"""
    CREATE (chpt:章:Koktai)
    SET chpt = {props}
    """
    props = extract_chapter_props(chpt)
    tx.append(req, {"props":props})
    for char in chpt.chars:
        #print char.hanji.encode("utf8")
        create_char(tx, props["SID"], char)


def create_indexes():
    try:
        GRAPH.cypher.execute("""
        CREATE CONSTRAINT ON (n:Koktai) ASSERT n.SID IS UNIQUE
        """)
    except:
        print "index creation failed (maybe it already exists)"


def main(path):
    with open(path) as F:
        data = pickle.load(F)
        create_indexes()
        tx = GRAPH.cypher.begin()
        for chpt in data:
            create_chapter(tx, chpt)
        tx.commit()



if __name__ == "__main__":
    import sys
    main(sys.argv[1])

