# -*- coding: utf8 -*-
import re
import py2neo



# 八<rt> ㄅㄨㆤㆷ/ㄅㆤㆷ</rt> => {{ruby|八|ㄅㄨㆤㆷ<br/>ㄅㆤㆷ}} 
# 
re_rt = re.compile(ur"([^\)>])(·?)<rt>([^<]+)</rt>")
re_rtmark = re.compile(ur"(<mark>[^<]*?</mark>)(·?)<rt>([^<]+?)</rt>")
re_rtpar = re.compile(ur"(\([^\)>]\))(·?)<rt>([^<]+)</rt>")
def zhuyin_to_ruby(s):
    s = s.replace("</rt>/<rt>","/")
    for re in [re_rt, re_rtmark, re_rtpar]:
        s = re.sub("{{ruby|\\1|\\2\\3}}",s)
    return s


re_img = re.compile(ur"<img src=\"img/m3/([^\"]+)\" />")
def img_to_wiki(s):
    return re_img.sub("[[File:\\1|20px]]",s)





def word_to_wiki(w):
    return u"""
==='''『%(entry)s』'''===
:%(content)s
    """ % ({"entry": img_to_wiki(zhuyin_to_ruby(w[u"項"])),
        "content": img_to_wiki(zhuyin_to_ruby(w[u"本文"])).strip().replace("\n","\n:")})



def reading_to_wiki(r):
    return "'''%(cks)s''' %(content)s\n" % { "cks": r[u"參考書"], "content": img_to_wiki(zhuyin_to_ruby(r[u"本文"]))}

def hanji_to_wiki(ji, readings):
    return """
==%(hanji)s==

%(fanqie)s

%(readings)s
    """ % { "hanji": img_to_wiki(zhuyin_to_ruby(ji[u"字"])),
            "fanqie": img_to_wiki(zhuyin_to_ruby(ji[u"反切"])),
            "readings": "\n".join([reading_to_wiki(r) for r in readings])}

if __name__ == "__main__":
    GRAPH = py2neo.Graph()
    # chapters
    req_chpt = """
    MATCH (c:章) RETURN c
    """
    for row in GRAPH.cypher.execute(req_chpt):
        #TODO: correct DB for zhuyin vertical yi
        filename = row["c"][u"注音"].strip().replace('<img src="img/m3/8ed5.png" />',u"一").replace("/","-")
        if "img" in filename:
            print "coding issue with", row["c"]["SID"].encode("utf8")
            continue
        with open((u"./國臺對照活用辭典/" + filename).encode("utf8"),"w") as F:
            req = """
            MATCH (c:章 {SID:{id}}) --> (n:字) --> (r:音)
            OPTIONAL MATCH (n) --> (w:詞)
            RETURN n,collect(DISTINCT r) as readings, collect(DISTINCT w) as words LIMIT 10
            """
            for row_ji in GRAPH.cypher.execute(req, {"id": row[u"c"][u"SID"]}):
                print >>F, hanji_to_wiki(row_ji['n'].properties, row_ji['readings']).encode("utf8")
                for w in row_ji['words']:
                    print >>F, word_to_wiki(w).encode("utf8")
