import py2neo


stmt = """
MATCH (e:NgoError) <-- (:NgoSyl) <-- (f:NgoForm)
WITH e.wsl as wsl ,[y in collect(f) | y.form] AS words RETURN wsl, words
"""

def main():
    g = py2neo.Graph()
    results = g.cypher.execute(stmt)
    for r in results:
        print ("%s\t%s" %(r.wsl, " ".join(r.words))).encode('utf8')


if __name__ == "__main__":
    main()
