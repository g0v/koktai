import fileinput
import py2neo

import wsl_to_kaulo
import analyse_word_entry

from py2neo.packages.httpstream import http
import httplib

# avoid timeout  and incomplete reads for big import in transaction
http.socket_timeout = 9999
httplib.HTTPConnection._http_vsn = 10
httplib.HTTPConnection._http_vsn_str = 'HTTP/1.0'


CONSTRAINTS = [
        "CREATE CONSTRAINT ON (f:NgoForm) ASSERT f.form IS UNIQUE",
        "CREATE CONSTRAINT ON (s:NgoSyl) ASSERT s.raw IS UNIQUE",
        "CREATE CONSTRAINT ON (r:NgoRom) ASSERT r.wsl IS UNIQUE",
        "CREATE CONSTRAINT ON (e:NgoError) ASSERT e.wsl IS UNIQUE",
        ]

class DummyTx(object):
    def __init__(self, g):
        self.g = g

    def append(self,statement, params=None):
        print statement, params
        self.g.cypher.execute(statement, params)

    def commit(self):
        pass

g = py2neo.Graph()

# add constraints to the graph
for c in CONSTRAINTS:
    g.cypher.execute(c)

def merge_in_graph(tx, e):
    e['key'] = "".join([e['entry'],e['nh']])
    stmt_form = """
    MERGE (:NgoForm {form:{form}})
    """
    stmt_word = """
    MATCH (f:NgoForm {form:{key}})
    MERGE (f) -[:entry]-> (:NgoWord {key: {key},
                                     entry: {entry},
                                     nh: {nh},
                                     POS: {POS},
                                     body: {body}})
    """
    stmt_syl = """
    MATCH (w:NgoForm {form: {key}})
    MERGE (s:NgoSyl {raw: {raw}})
    ON CREATE SET s.sino = {sino}, s.wsl = {wsl}
    MERGE (w) -[:contains {nth: {n}}]-> (s)
    """
    stmt_rom = """
    MATCH (s:NgoSyl {raw: {syl}})
    MERGE (r:NgoRom {wsl: {wsl}})
    ON CREATE SET r.rom = {rom}
    MERGE (s) -[:contains]->  (r)
    """
    stmt_err = """
    MATCH (s:NgoSyl {raw: {syl}})
    MERGE (e:NgoError {wsl: {wsl}})
    MERGE (s) -[:contains]-> (e)
    """

    stmt_sentence = """
    MATCH (w:NgoWord {key: {key}})
    CREATE (s:NgoSentence {lang: {lang}, text:{sentence}})
    CREATE (w) -[:NgoDef {n: {n}}]-> (s)
    """
    tx.append(stmt_form, {'form': e['key']})
    tx.append(stmt_word, e)
    for n,s in enumerate(e['sentences']):
        tx.append(stmt_sentence, {
            'key':e['key'],
            'lang': s['lang'],
            'sentence': s['sentence'],
            'n': n})

    syl_list = wsl_to_kaulo.check_entry(e['entry'])
    for n,(sino, readings) in enumerate(syl_list):
        wsl = "/".join(readings)
        tx.append(stmt_syl, {'raw': sino + wsl,
                             'sino': sino,
                             'wsl': wsl,
                             'key': e['key'],
                             'n': n})
        for r in readings:
            rom = wsl_to_kaulo.convert(r)
            if rom is not None:
                tx.append(stmt_rom, {'syl': sino + wsl,
                                     'rom': rom,
                                     'wsl': r})
            else:
                tx.append(stmt_err, {'syl': sino + wsl, 
                                     'wsl': r})



def main():
    i = 0
    tx = g.cypher.begin()
    #tx = DummyTx(g)
    for line in fileinput.input():
        i += 1
        # not sure about the proper encoding to use
        # Perl actually does a better job on this, original encoding is CP950
        try:
            line = line.decode('utf8')
            if line.startswith('~t96;'):
                # should be a word ?
                entry = analyse_word_entry.parse_one(line)
                if entry is None:
                    continue
                merge_in_graph(tx, entry)
                if (i % 50) == 0:
                    #print i
                    tx.commit()
                    tx = g.cypher.begin()
                    
        except UnicodeDecodeError:
            print "encoding error on line", i
    tx.commit()
    


if __name__ == "__main__":
    main()

