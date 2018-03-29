# 國臺對照活用辭典

## 吳家原註

感謝所有協助我們完成將《國臺對照活用辭典》上線公開的朋友。

以下所有檔案無論副檔名，皆為純文字檔，有PE2年代的列印控制指令

    beta*.dic       =       辭典本文
    PH-COMP.TXT     =       方音音標對照表
    PHSOURCE        =       華語台語注音符號溯源
    PREFACE1.DIC    =       編輯緣起、凡例
    TAPHONI.TXT     =       台灣閩南語語音標系統
    mytaiin8        =       綜合閩方言拼音總表

### 造字圖檔 (img 目錄)

次目錄：m3、k。

目錄內容為 128x128 的造字點陣圖，以小寫 Big-5 碼為檔名。

### 造字檔 (font 目錄)

此辭典的編輯是用 DOS 系統，所以用的是倚天中文，新翰藝排版系統。

原始編輯者，吳守禮外孫蔡彰豪，現旅居美國，對這些檔案說明如下：

內碼：即編碼，如 ASCII, Unicode/UTF-8 等。所有字典相關的檔案皆採用 Big-5 碼。
造字：Big-5 碼留有使用者造字區，約有 5000 個內碼。

因每個使用者可以定義自己的造字，檔案須配合「造字檔」才能正確顯示及列印。
台灣方音符號拼音：由一至三個符號 (聲母、韻母) 及音調組成，為螢幕顯示及排版方便，
每一個「音」佔據一個內碼，也形成一個正方形的「字」。

字體：細明體 (m3)，楷書 (k)。

螢幕顯示及字典本文使用新細明體，故絕大多數台灣方音符號拼音定義於細明體。楷書則用於台語字。
例外的部分是因為內碼不夠用所造成。

造字檔：螢幕顯示使用倚天中文的造字檔格式，似乎是稱作 CMEX 格式。
列印使用倚天新翰藝的造字檔格式，稱作 XFN 格式。

* CMEX 造字檔格式請參考：cmexuf.[ch]
* XFN 造字檔格式請參考：xfn.[ch]
* 台語字造字原始檔為：han.xfn ha2.xfn oth.xfn
* usrfont.lst 內容：內碼 <-> 台灣方音符號對照

格式規則：

1. 跳過空白行
2. 若一行以英文句號「.」開頭，則跳過。
3. 每一行定義一個內碼，以空白字元分隔欄位定義。(space-separated values.)
4. 第一個欄位為字體：m3 為細明體，k 為楷書。因使用者造字區可容納的字數不足，相同內碼，但不同字體時，代表不同的字。
5. 第二的欄位為內碼 (Big-5 碼)。
6. 第三個欄位為拼音的定義，以台灣方音符號鍵盤的按鍵所定義，如 1 代表ㄅ。拼音以逗號分隔「聲母韻母」及「音調」，音調有 15 聲。請參考 tai.c。

## 著作權

《吳守禮國台對照活用辭典》作者：吳守禮（Ngo Shiu Le、Ngo ShuLeh、Wu Shouli） ，本辭典電子原始檔由吳守禮家族授權中華民國維基媒體協會，以創用CC 姓名標示-相同方式分享 3.0 台灣 授權條款釋出。除原始資料外，此檔案庫內轉換格式、重新編排的編輯著作權等衍生著作物授權皆為創用CC 姓名標示-相同方式分享 3.0 台灣。
