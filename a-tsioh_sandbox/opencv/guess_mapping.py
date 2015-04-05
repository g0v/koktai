import os
import sys

import cv2
import numpy as np


NBESTS = 5

matcher = cv2.BFMatcher(crossCheck=False)
#matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
sift = cv2.SIFT()
#orb = cv2.ORB()
kernel = np.ones((3,3),np.float32)/(3*3)
dilate_kernel = np.ones((3,1),np.uint8)

def compare_two(des1,des2):
    if des1 is None or des2 is None:
        return np.float("inf")
    N = int(len(des1)*0.95)
    distsA = sorted([x.distance for x in matcher.match(des1,des2)])[:N]
    if len(distsA) == 0 :
        return np.float('inf')
    if len(distsA) < N:
        distsA.extend([distsA[-1]*1.3]*(N-len(distsA)))
    #N2 = int(N*0.8) #int(len(des1)*1.0)
    #distsB = sorted([x.distance for x in matcher.match(des2,des1)])[:N2]
    #if len(distsB) == 0 :
    #    return np.float('inf')
    #if len(distsB) < N2:
    #    distsB.extend([distsB[-1]*1.3]*(N2-len(distsB)))
    return np.nanmean(distsA)

def compute_descriptions(paths, dilate=False):
    result = {}
    for p in paths:
        im = cv2.imread(p)
        
        #blur
        im = cv2.filter2D(im,-1,kernel)

        #dilate
        if dilate:
            im = cv2.dilate(im, dilate_kernel, iterations=1)
        #else:
        #    im = cv2.erode(im, kernel3, iterations=1)
        
        #thresholding
        _, im = cv2.threshold(im, 200, 255, cv2.THRESH_BINARY)
        
        #im = np.uint8(np.absolute(cv2.Laplacian(im, cv2.CV_64F)))
        #gray = cv2.cvtColor(blurry, cv2.COLOR_BGR2GRAY)
        kp, des = sift.detectAndCompute(im, None)
        #kp, des = orb.detectAndCompute(im, None)
        result[p] = des
    return result

def main(sources, targets):
    s_desc = compute_descriptions(sources, dilate=True)
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

