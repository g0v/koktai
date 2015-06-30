from 分漢字注音 import 分漢字注音
from os.path import dirname, abspath, join


if __name__=='__main__':
    這馬資料夾 = dirname(abspath(__file__))
    漢字注音=分漢字注音()
    with open(join(這馬資料夾, '..', 'tai.jade')) as 檔案:
        for 逝 in 檔案:
            try:
                漢字注音.分一逝而且轉注音(逝)
            except:
                print(逝,漢字注音.分一逝(逝))
#                 print(逝,漢字注音.分一逝而且轉注音(逝))