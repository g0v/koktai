from unittest.case import TestCase


from 分漢字注音 import 分漢字注音

class 分漢字注音試驗(TestCase):
    def setUp(self):
        self.漢字注音 = 分漢字注音()
    def test_無漢字一注音(self):
        self.比較一字(
            '( )󸍐',
            ([], ['󸍐'])
        )
    def test_一漢字一注音(self):
        self.比較一字(
            '笑󹿋',
            (['笑'], ['󹿋'])
        )
    def test_一漢字一自造一注音(self):
        self.比較一字(
            '<k>󸹸</k>󿭪',
            (['<k>󸹸</k>'], ['󿭪'])
        )
    def test_兩漢字一注音(self):
        self.比較一字(
            '賬(/帳)󺂳',
            (['賬', '帳'], ['󺂳'])
        )
    def test_兩漢字一自造一注音(self):
        self.比較一字(
            '到(/<k>󿩂</k>)󹓵',
            (['到', '<k>󿩂</k>'], ['󹓵'])
        )
    def test_一漢字兩注音(self):
        self.比較一字(
            '章󹻋/󹺡',
            (['章'], ['󹻋', '󹺡'])
        )
    def test_中央的括號莫愛(self):
        self.比較一字(
            '<k>󿭐</k>(「此󹹂一󹻃」的縮音字)(/此)󹻂',
            (['<k>󿭐</k>', '此'], ['󹻂'])
        )
    def test_加切漢字(self):
        with self.assertRaises(ValueError):
            self.比較一字(
                '。癰󸷗',
                ([], ['󸍐'])
            )
    def test_袂使是括號(self):
        with self.assertRaises(ValueError):
            self.比較一字(
                ')󹍲',
                ([], ['󸍐'])
            )
    def 比較一字(self, 原本, 答案):
        結果 = self.漢字注音.分一字(原本)
        self.assertEqual(結果, 答案)
    def test_分一般句(self):
        self.比較一逝長度(
            '一󹻃四󺁠界(/過)󹛘/󹕬攏󸩡<k>󿫊</k>(/亦)󸹃有󸞴。',
            6
        )
    def test_有加的字(self):
        self.比較一逝長度(
            '頭󹅨前󹻓(/前󹻓面󿵉)。',
            2
        )
    def 比較一逝長度(self, 原本, 答案):
        結果 = self.漢字注音.分一逝(原本)
        self.assertEqual(len(結果), 答案, 結果)
