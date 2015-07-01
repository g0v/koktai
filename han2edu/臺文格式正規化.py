import json
from os.path import dirname, abspath, join
import re


from 分漢字注音 import 分漢字注音
from itertools import chain


class 臺文格式正規化:
    def __init__(self):
        這馬資料夾 = dirname(abspath(__file__))
        self.注音表 = {}
        with open(join(這馬資料夾, '..', 'font', 'm3.json')) as 檔案:
            for 編號, 注音 in json.load(檔案).items():
                self.注音表[0xf0000 + int(編號, 16)] = 注音
        self._漢字注音 = 分漢字注音()
    def 正規化(self, 文本):
        文本 = self._處理箭頭(文本)
        文本 = self._處理注音括號(文本)
        return 文本 
    def _處理注音括號(self, 文本):
        return re.sub('(\(/[\U000F0000-\U000Fffff]\))', self._是注音就提掉, 文本)
    def _是注音就提掉(self, 子字串):
        if ord(子字串.group(0)[2]) in self.注音表:
            return 子字串.group(0)[1:3]
        return 子字串.group(0)
    def _處理箭頭(self, 文本):
        所在 = len(文本) - 1
        while 所在 >= 0:
            if 文本[所在] == '→':
                幾個注音 = 1
                while 所在 + 幾個注音 < len(文本) and ord(文本[所在 + 幾個注音]) in self.注音表:
                    幾個注音 += 1
                幾個注音 -= 1
                if 幾個注音 != 0:
                    切漢字 = re.compile('([^\U000F0000-\U000Fffff]+[\U000F0000-\U000Fffff]){'
                             + '{}'.format(幾個注音) + 
                             '}[^\U000F0000-\U000Fffff]*\Z')
                    揣頭前漢字 = 切漢字.search(文本[:所在])
                    上頭前的開始 = 揣頭前漢字.start(0)
                    全部字串 = [文本[:所在 + 1]]
                    
                    全部漢字 = []
                    for 漢字, _注音 in self._漢字注音.分一逝(文本[上頭前的開始:所在]):
                        全部漢字.append(漢字)
                    表達式 = '(' + '.*'.join(chain.from_iterable(全部漢字)) + ')'
                    開始的所在 = re.search(表達式, 文本[上頭前的開始:所在]).start(1)
                    
                    切漢字 = re.compile('([^\U000F0000-\U000Fffff]+[\U000F0000-\U000Fffff])'
                             * 幾個注音 + '[^\U000F0000-\U000Fffff]*$')
                    上尾文本 = 切漢字.split(文本[上頭前的開始 + 開始的所在:所在])
                    for 第幾個, 漢字注音 in enumerate(上尾文本[1:-1]):
                        全部字串.append(漢字注音[:-1])
                        全部字串.append(文本[所在 + 1 + 第幾個])
                    全部字串.append(文本[所在 + 幾個注音 + 1:])
                    文本 = ''.join(全部字串)
            所在 -= 1
        return 文本
