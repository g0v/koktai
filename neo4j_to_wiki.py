# -*- coding: utf8 -*-
import re
import py2neo
import codecs
import os
import unicodedata as ud

ids_mapping = {}
def load_ids_koktai_data(path):
    global ids_mapping
    with codecs.open(path,"r","utf8") as F:
        _ = F.readline() #discard headers
        for l in F:
            (code, link, ids, _) = l.split(",",3)
            if ids != "x" and ids != "":
                ids_mapping[code[2:].lower()] = ids



# 八<rt> ㄅㄨㆤㆷ/ㄅㆤㆷ</rt> => {{ruby|八|ㄅㄨㆤㆷ<br/>ㄅㆤㆷ}} 
# 
re_rt = re.compile(ur"([^>])(·?)<rt>([^<]+)</rt>", re.U)
re_rt_markup = re.compile(ur"(<[^>]+>[^<]+?</[^>]+>)(·?)<rt>([^<]+)</rt>", re.U)
re_rt_only = re.compile(ur"(·?)<rt>([^<]+)</rt>", re.U)
def zhuyin_to_ruby(s):
    ruby = lambda txt,annot: "{{Ruby|%s|%s}}" %( txt, annot.replace("/","<br/>"))
    s = s.replace("</rt>/<rt>","/")
    s = s.replace("</rt><rt>","")
    # 1 ruby on <mark> or <img>
    buf = []
    m = re_rt_markup.search(s)
    while m is not None:
        (begin, end) = m.span()
        buf.append(s[:begin])
        buf.append(ruby(m.group(1),m.group(2)+m.group(3)))
        s = s[end:]
        m = re_rt_markup.search(s)
    buf.append(s)
    s = "".join(buf)

    # 2 ruby with preceeding char
    buf = []
    m = re_rt.search(s)
    while m is not None:
        (begin, end) = m.span()
        buf.append(s[:begin])
        try:
            if "CJK" in ud.name(unicode(m.group(1))):
                buf.append(ruby(m.group(1),m.group(2)+m.group(3)))
            else:
                buf.append("".join(m.groups()))
        except:
            buf.append("".join(m.groups()))
        s = s[end:]
        m = re_rt.search(s)
    buf.append(s)
    s = "".join(buf)
    
    # 3 ruby without left char
    s = re_rt_only.sub("\\1\\2",s)
    return s





        
    for re in [re_rt, re_rtmark, re_rtpar]:
        s = re.sub("{{ruby|\\1|\\2\\3}}",s)
    #s = re.sub("{{ruby||\\1\\2}}",s)
    return s


images_to_upload = set()
def replace_by_ids(s,regex, mapping, dbg_msg=""):
    m = regex.search(s)
    output = []
    while m is not None:
        (begin, end) = m.span()
        code = m.groups()[1]
        directory = m.groups()[0]
        if not directory:
            directory = "k"
            # TODO: continue here
        images_to_upload.add((directory,code))
        if code in mapping:
            output.append(s[:begin])
            output.append("(%s)%s" %(code,mapping[code]))
            print dbg_msg, "ids found for code", code
        else:
            print dbg_msg, "IDS not found for code", code
            output.append(s[:end])
        s = s[end:]
        m = regex.search(s)
    output.append(s)
    return "".join(output)


re_img = re.compile(ur"<img src=\"img/(m3|k)/([^\"]+).png\" />")
def img_to_wiki(s):
    s = replace_by_ids(s, re_img, ids_mapping, "img" )
    return re_img.sub("[[File:\\1 \\2.png|20px]]",s)

re_mark = re.compile(ur"<mark(X?)>&#xf(....);</mark>")
def mark_to_wiki(s):
    return replace_by_ids(s, re_mark, ids_mapping, "mark")


def word_to_wiki(w):
    return mark_to_wiki(u"""
==='''【%(entry)s】'''===
:%(content)s
    """ % ({"entry": img_to_wiki(zhuyin_to_ruby(w[u"項"])),
        "content": img_to_wiki(zhuyin_to_ruby(w[u"本文"])).strip().replace("\n","\n:")}))



def reading_to_wiki(r):
    return "'''%(cks)s''' %(content)s\n" % { "cks": r[u"參考書"], "content": img_to_wiki(zhuyin_to_ruby(r[u"本文"]))}

def hanji_to_wiki(ji, readings):
    return mark_to_wiki("""
==%(hanji)s==

%(fanqie)s

%(readings)s
    """ % { "hanji": img_to_wiki(zhuyin_to_ruby(ji[u"字"])),
            "fanqie": img_to_wiki(zhuyin_to_ruby(ji[u"反切"])),
            "readings": "\n".join([reading_to_wiki(r) for r in readings])})

if __name__ == "__main__":
    GRAPH = py2neo.Graph()
    # chapters
    load_ids_koktai_data(os.path.dirname(__file__) + "/koktai-ids.csv")
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
            MATCH (c:章 {SID:{id}}) -[l]-> (n:字) -[l2]-> (r:音)
            OPTIONAL MATCH (n) --> (w:詞)
            WITH n,r,w ORDER BY n.order, r.order, w.order
            RETURN n,collect(DISTINCT r) as readings, collect(DISTINCT w) as words
            """
            for row_ji in GRAPH.cypher.execute(req, {"id": row[u"c"][u"SID"]}):
                print >>F, hanji_to_wiki(row_ji['n'].properties, row_ji['readings']).encode("utf8")
                for w in sorted(row_ji['words'], key=lambda x:x['order']):
                    print >>F, word_to_wiki(w).encode("utf8")
    #prepare images to upload
    for directory, code in images_to_upload:
        print "cp ", directory, code
        os.system("cp ./img/%s/%s.png WikiCommons/%s-%s" % (directory, code, directory, code))

