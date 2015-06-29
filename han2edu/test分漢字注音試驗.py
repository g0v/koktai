from unittest.case import TestCase


from 分漢字注音 import 分漢字注音

class 分漢字注音試驗(TestCase):
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
        漢字注音 = 分漢字注音()
        結果 = 漢字注音.分一字(原本)
        self.assertEqual(結果, 答案)
#     def test_中央的括號有注音莫愛(self):
#         self.比較一字(
#             '例󹎿(/前󹻓例󹎿)',
#             (['<k>󿭐</k>', '此'], ['󹻂'])
#         )
