from PIL import Image
import sys
import os
import json


SIZE=(10,10)


def compute_vec(path):
    im = Image.open(path)
    small = im.resize(SIZE)
    return list(small.im)


def main(folder):
    files = [f for f in os.listdir(folder) if f.endswith(".png")]
    data = {f[:-4]:compute_vec(os.path.join(folder,f)) for f in files}
    print json.dumps(data)


if __name__ == "__main__":
    main(sys.argv[1])

