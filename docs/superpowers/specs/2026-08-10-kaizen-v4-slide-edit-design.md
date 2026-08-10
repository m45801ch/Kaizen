# 改善提案生成器 V4：一頁簡報版面文字直接編輯設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

AI 生成一頁簡報後，標題、3 個重點、3 項效益、結語目前為純 HTML 字串（`esc()` 輸出），無法在版面直接修改。本設計讓使用者在版面直接點選編輯這些文字；效益文字中的百分比一改，長條圖/圓餅圖即時同步重畫；修改即時寫入 `data.slide` 並存 localStorage，刷新與列印保留。

## 二、方案

### 1. slide 模板（`v4/js/templates/slide/index.js`）

render 時為文字元素加 `contenteditable="true"` 與 `data-slide-field`：

- 標題：`<div class="slide-title" contenteditable="true" data-slide-field="slideTitle">`
- 重點：`<li contenteditable="true" data-slide-field="keyPoints-{i}">`
- 效益標籤：`.sc-label` 加 `contenteditable="true" data-slide-field="benefits-{i}"`
- 結語：`<div class="slide-conclusion" contenteditable="true" data-slide-field="conclusion">`
- 注意：`contenteditable` 內容中若含 `**` 強調標記，render 時仍用 `esc()`（保留字面 `**`）；編輯後讀 `textContent` 原樣存回。

### 2. 綁定與同步（`v4/js/document.js` `bindDocument`）

沿用既有「每次 `renderDocument()` 後直接綁定」模式（f-* 欄位即如此），於 `#doc` 內為 `[data-slide-field]` 元素掛事件（在 bound 守衛之前）：

- `input` 事件：
  - 依 `data-slide-field` 寫回 `data.slide` 對應欄位（`slideTitle`→`s.slideTitle`；`keyPoints-i`→`s.keyPoints[i]`；`benefits-i`→`s.benefits[i]`；`conclusion`→`s.conclusion`）。
  - 呼叫 `saveForm()`。
  - 若欄位是 `benefits-*`：重繪圖表（只更新 `#doc .slide-benefits` 內 `.sc-svg` 的 innerHTML，**不重建標籤 DOM**，避免正在編輯的標籤失去焦點/游標跳走）。
- 不重繪整份 `renderDocument()`（會打斷編輯）。

### 3. 圖表重繪邏輯

- 抽出圖表 SVG 生成為可單獨呼叫的函式（在 `slide/index.js` 匯出，或於 `document.js` 內實作同一演算法），輸入 `s.benefits`、`s.chartType`，輸出 `.sc-svg` 的 SVG 字串。
- 編輯效益標籤時，重新解析該條百分比 → 重畫長條高度/圓餅扇區。
- 抽不到百分比時維持原值（不重畫或保持該條原值）。

### 4. 列印

編輯已即時寫回 `data.slide`，`renderDocument()` 以最新資料渲染 → 列印/PDF 即為最新內容。contenteditable 元素內容於列印時正常顯示。

## 三、不變項目

- 照片區、圖表容器樣式、其他模板（generic/safety/quality）、`generateAll`/`generateSlide` AI 流程不變。
- `data.slide` 結構不變（`slideTitle/keyPoints/benefits/conclusion/chartType`）。

## 四、驗收標準

1. 生成一頁簡報後，可直接點選標題/重點/效益標籤/結語編輯文字。
2. 編輯效益文字中的百分比（如 50%→60%）→ 長條圖/圓餅圖即時重畫；其他欄位編輯不影響圖表。
3. 修改後刷新頁面，簡報內容保留修改（localStorage 持久化）。
4. 列印/PDF 輸出的簡報含修改後文字與圖表。
5. 重新按「生成一頁簡報」會以新 AI 結果覆寫 `data.slide`。
