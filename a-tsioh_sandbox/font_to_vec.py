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
    ttfont = ImageFont.truetype ('/usr/share/fonts/truetype/arphic/uming.ttc', 128)
    image = Image.new ('1', (128, 128), 0);
    ImageDraw.Draw(image).text( (0, 0), text, font = ttfont, fill = 1 )
    small = image.resize(SIZE)
    data["%x"%(ord(text),)] = small.histogram()


print json.dumps(data)
