#! /usr/bin/python
# -*- coding: utf-8 -*-

import Image
import ImageDraw
import ImageFont
import json

from png_to_vec import scan_lines_and_columns

SIZE = (60,60)

chars = [x.decode('utf8').strip() for x in open("unicode_bmp_charlist.txt").readlines()]
chars += [x.decode('utf8').strip() for x in open("unicode_ext_charlist.txt").readlines()]

data = {}
for text in chars:
    #ttfont = ImageFont.truetype('/usr/share/fonts/truetype/arphic/uming.ttc', 128)
    minfont = ImageFont.truetype("/usr/share/fonts/truetype/hanazono/HanaMinB.ttf", 128)
    ttfont = ImageFont.truetype("/usr/share/fonts/truetype/hanazono/HanaMinA.ttf", 128)
    image = Image.new ('1', (128, 128), 1);
    if ord(text) <= 0x1ffff :
        ImageDraw.Draw(image).text( (0, 0), text, font = ttfont, fill = 0 )
    else:
        ImageDraw.Draw(image).text( (0, 0), text, font = minfont, fill = 0 )
    image.save("./arphic/" + "%x" %(ord(text),) + ".png")
    small = image.resize(SIZE)
    data["%x"%(ord(text),)] = small.histogram()


#print json.dumps(data)
