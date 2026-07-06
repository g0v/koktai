# 本地預覽（Astro + Pug 3）

- **首頁**：`src/pages/index.astro`——書名、對照字例（八）、二十六卷拇指索引、附錄、關於
- **辭典／附錄**：`pug/*.pug` → **Pug 3** → Astro（**卷** `/<vol>/index.html` 音節目錄；**音節** `/<vol>/<n>/index.html` 條目內文；附錄 `/<name>/index.html`）
  - `pug/` 是 1990 年代 `.dic` 轉換產生的**資料成品**（三千萬字元，現由純 TS pipeline 重產，見「其他」），不是手寫模板——
    真正的模板層在 Astro（layout／pages）。檔案為 Pug 3 語法
    （`doctype html`、一般屬性、行內 HTML 文字）。
    舊版 Jade 1.11 產物已於 2026-07-04 驗證內容等價後改以 Pug 3 編譯
    （僅差 pretty 空白；pre-wrap 附錄頁因此更貼近原始檔）。
    原 `include _head` 已內聯至各檔（head 由 Astro layout 取代）。
- **靜態資源**：`bun run sync` → `public/`（han、字形圖；來源在 `html/` 與 `img/`）。站內字型由 `src/fonts/` 經 Vite 打包進 `_astro/`。

```sh
bun install
bun run start      # sync + astro dev → http://localhost:4173
bun run build      # 產出 dist/（含 section:snapshots、relativize-dist-assets）
bun run preview    # Astro preview（與「整包 dist 靜態服務」行為可能略有差異）
```

建置後 **`dist/` 為前綴無關**：可整包上傳至 GitHub Pages 子路徑或本機 `cd dist && python3 -m http.server`。

## 版面設計

設計記號集中在 `src/styles/tokens.css`（色票、字級、文武線、磨石子斑點）；
版式規則在 `src/styles/site.css`。要點：

- **色**：磁白紙面、鐵墨、倚天藍（互動）、銅（文武線）、硃（印）。深色模式＝倚天夜。
- **字**：內文用系統明體（新細明體血統）；標題與注音層用芫荽 Iansui 子集
  （`scripts/subset-display.ts` 產生 `html/font/iansui-koktai.woff2`，SIL OFL，
  授權全文在 `html/font/OFL-Iansui.txt`）；辭條書脊／字頭（`entry-spine`、
  `char-head`、舊版 `.entry h3`）用 `--font-spine`（明體），不用 Iansui，以免
  未收進子集的漢字與楷體 fallback 混排；罕用台語字沿用 `koktai-k.woff` 楷書造字。
- **編譯轉換**：`lib/compile-pug.ts` 的 `transformVolume()` 把未加 class 的原始
  DOM 包成 `<section id="s-N">`（書眉導引）、`.entry`（`content-visibility` 效能）、
  `dd.lbl`＋`u.lg`（華語陽刻／台陰刻語言籤）、`rt.rt-l`（長注音縮排）。
  內容中的 `<u>國語</u>` 依站方用語顯示為「華語」；直式「丨」（Big-5 時代的
  注音 i）在讀音與音節標題一律轉為橫式「ㄧ」（同教育部辭典慣例）；書名不變。
- **音節導覽**：卷內側欄（桌機）／浮動抽屜（行動）＋ IntersectionObserver 捲動
  同步；跳轉後以有界 rAF 迴圈校正 `content-visibility` 造成的落點漂移。
- **附錄**：`preface1`、`phsource` 以明體排版並保留原稿硬斷行，PE2 排版指令
  （`.TL`、`.PO` ……）以等寬字顯示；表格類（`ph-comp` 等）整頁等寬，置於
  倚天藍「原始檔」面板。

## 卷頁效能（實測與界線）

- **已量到的負載**（拆頁後）：單音節頁遠小於整卷 monolith（舊例 `dist/02.html` 約 **5.9 MiB**）；卷 hub 僅音節索引。`bun run volume:stats` 可列 26 卷。
- **建置**：`bun run build` 先跑 **`section:snapshots`**（`public/sections/…/index.html` 快照），再產出 `dist/<vol>.html` 與 `dist/<vol>/<n>.html`。
- **錨點閘門**：`check-built-html.ts` 驗證 **`.kk` 跨卷連結** 的 `#w-`/`#c-` 錨點；`anchor-integrity.test.ts` 驗證 corpus 路由。
- **怎麼驗證**：DevTools 對 `01/3.html` 等單音節 URL 錄製重新載入。

## 平行建置

`bun run precache`（`build` 會自動先跑）用 Bun worker 依核心數平行編譯 31 個
pug 檔到 `.cache/pug/*.json`，Astro 再從快取渲染——route 產生從約 9.4s 降到
約 2s。快取以 pug 原始檔與 `lib/compile-pug.ts` 的 mtime 判斷新舊。並附
不變量檢查：每卷 pug 的 h2 數必須等於轉換後的 section 數（防止標題 div 帶
附註 dd 之類的結構變體悄悄漏切，卷一的 ㄆㄈ 即屬此類）。

## 其他

- `bun run compile`：僅匯出 flat HTML 到 `dist/`（舊 Makefile 對照用，非 Astro 必須）
- 從 `.dic` 重產 `pug/`：**`bun run gen:pug`**（純 TypeScript）。對照閘門：**`bun run diff:pug`**（GitHub Actions 亦執行）。型別：**`bun run check`**。歷史 Perl／Python 對照：**`PARITY_LEGACY=1 bun run parity:stage …`**（腳本在 `archive/legacy-py3-parity/` 等）；日常建置不需要 perl 或 python3。
- 更動站內文案後若用到新漢字，重跑 `bun run scripts/subset-display.ts`（會掃描
  `src/` 與 `lib/` 的字面字元；需要 `/tmp/koktai-fonts/Iansui-Regular.ttf`，
  取得方式見該檔開頭註解）
