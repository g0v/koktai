import sys
import os
import json

import phash

NBESTS = 5

def compare_two_hash(h1,h2):
    return phash.cross_correlation(h1,h2)

def compute_hashtable(paths):
    return {x:phash.image_digest(x) for x in paths}

def main(sources, targets):
    s_hashs = compute_hashtable(sources)
    t_hashs = compute_hashtable(targets)
    results = {}
    print "<html><body>"
    for s in sources:
        scores = []
        for t in targets:
            corr = compare_two_hash(s_hashs[s],t_hashs[t])
            scores.append((corr, t))
            # print s,t,corr
        results[s] = [ (t,sc)  for sc,t in sorted(scores)[-NBESTS:]]
        #print "best",s, results[s]
    #print json.dumps(results)
        print "".join(["<img src=\"%s\"/>(%.2f)" % x for x in [(s,1.0)] + results[s]])+"<br/>"
    print "</body></html>"


if __name__ == "__main__":
    s_dir = sys.argv[1]
    t_dir = sys.argv[2]
    sources = [os.path.join(s_dir,p) for p in os.listdir(s_dir) if p.endswith(".png")]
    targets = [os.path.join(t_dir,p) for p in os.listdir(t_dir) if p.endswith(".png")]
    main(sources, targets)



