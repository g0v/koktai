import json
from os.path import dirname, abspath, join
import re

class 分漢字注音:
    _提掉有注音的括號 = re.compile(r'\(/[^()]+[\U000F0000-\U000Fffff][^()]*\)')
    def __init__(self):
        這馬資料夾 = dirname(abspath(__file__))
        self.注音表 = {}
        with open(join(這馬資料夾, '..', 'font', 'm3.json')) as 檔案:
            for 編號, 注音 in json.load(檔案).items():
                self.注音表[0xf0000 + int(編號, 16)] = 注音
    def 分一逝而且轉注音(self, 文本):
        字資料陣列=self.分一逝(文本)
        for _,音陣列 in 字資料陣列:
            for 編號,音 in enumerate(音陣列):
                音陣列[編號]=self.注音表[ord(音)]
        return 字資料陣列
    def 分一逝(self, 文本):
        無解說文本 = self._提掉有注音的括號.sub('', 文本)
        所在 = len(無解說文本) - 1
        全部結果 = []
        while 所在 >= 0:
            if ord(無解說文本[所在]) in self.注音表:
                for 開頭 in range(所在 + 1):
                    try:
                        一字結果 = self.分一字(無解說文本[開頭:所在 + 1])
                    except ValueError:
                        pass
                    else:
                        全部結果.append(一字結果)
                        所在 = 開頭
                        break
            所在 -= 1
        return 全部結果[::-1]
                    
    def 分一字(self, 文本):
        注音 = [文本[-1]]
        文本 = 文本[:-1]
        while 文本.endswith('/'):
            文本 = 文本[:-1]
            注音.append(文本[-1])
            文本 = 文本[:-1]
        漢字 = []
        while 文本.endswith(')'):
            左括號所在 = None
            for 所在, 字串 in enumerate(文本):
                if 字串 == '(':
                    左括號所在 = 所在
            if 左括號所在 is None:
                raise ValueError('無左括號')
            字文本 = 文本[左括號所在:].strip('()/ ')
            if 字文本:
                有注音 = False
                for 字元 in 字文本:
                    if ord(字元) in self.注音表:
                        有注音 = True
                if not 有注音:
                    漢字.append(字文本)
            文本 = 文本[:左括號所在]
        if 文本:
            漢字.append(文本)
        for 一個漢字 in 漢字:
            if 一個漢字.startswith('<k>') and 一個漢字.endswith('</k>'):
                一個漢字 = 一個漢字[3:-4]
            if len(一個漢字) > 1:
                raise ValueError('超過一個漢字')
        return (漢字[::-1], 注音[::-1])
