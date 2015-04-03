import os
import sys

import cv2
import numpy as np


NBESTS = 10

matcher = cv2.BFMatcher()
sift = cv2.SIFT()
kernel = np.ones((5,5),np.float32)/25

def compare_two(des1,des2):
    return np.mean([x.distance for x in matcher.match(des1,des2)])

def compute_descriptions(paths):
    result = {}
    for p in paths:
        im = cv2.imread(p)
        blurry = cv2.filter2D(im,-1,kernel)
        gray = cv2.cvtColor(blurry, cv2.COLOR_BGR2GRAY)
        kp, des = sift.detectAndCompute(gray, None)
        result[p] = des
    return result

def main(sources, targets):
    s_desc = compute_descriptions(sources)
    t_desc = compute_descriptions(targets)
    results = {}
    print "<html><body>"
    for s in sources:
        scores = []
        for t in targets:
            dist = compare_two(s_desc[s],t_desc[t])
            scores.append((dist, t))
            # print s,t,corr
        results[s] = [(t,sc)  for sc,t in (sorted(scores)[:NBESTS])]
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

