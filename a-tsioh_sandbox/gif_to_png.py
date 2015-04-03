import sys
import os

from PIL import Image

def main(sources, target_dir):
    for s in sources:
        im = Image.open(s)
        im.convert("1").save(os.path.join(target_dir,os.path.basename(s).replace(".GIF",".png")))



if __name__ == "__main__":
    s_dir = sys.argv[1]
    t_dir = sys.argv[2]
    sources = [os.path.join(s_dir,p) for p in os.listdir(s_dir) if p.endswith(".GIF")]
    main(sources, t_dir)


