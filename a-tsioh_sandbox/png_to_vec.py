from PIL import Image
import sys
import os
import json


SIZE=(60,60)

def scan_lines_and_columns(vect):
    result = [0] * (SIZE[0] + SIZE[1])
    for x in range(SIZE[0]):
        for y in range(SIZE[1]):
            if vect[x+SIZE[1]*y]:
                result[y] += 1
                result[SIZE[1]+x] += 1
    return result

def distance(h1,h2):
    rms = math.sqrt(reduce(operator.add,map(lambda a,b: (a-b)**2, h1, h2))/len(h1))
    return rms

def compute_vec(path):
    im = Image.open(path)
    small = im.resize(SIZE)
    return small.histogram()
    return scan_lines_and_columns(list(small.im))


def main(folder):
    files = [f for f in os.listdir(folder) if f.endswith(".png")]
    data = {f[:-4]:compute_vec(os.path.join(folder,f)) for f in files}
    print json.dumps(data)


if __name__ == "__main__":
    main(sys.argv[1])

