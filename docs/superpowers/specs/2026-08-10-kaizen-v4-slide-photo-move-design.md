# 改善提案生成器 V4：一頁簡報照片拖拽移動位置 設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

一頁簡報（slide）模板的改善前/後照片目前可縮放（`state.slidePhotoSize` + `data-slide-resize`），但位置固定。本設計讓照片可**隨意在版面上拖動**改變位置，僅本次會話有效、各版面獨立（不動照片物件的 `dispX/dispY`、不影響其他模板）。

## 二、方案

### 1. 記憶（memory-only，不持久化）

新增 `state.slidePhotoPos`（與 `state.slidePhotoSize` 同模式）：

```js
slidePhotoPos: {}   // { [photoId]: { x, y } }
```

### 2. slide 模板 render（`v4/js/templates/slide/index.js`）

`.slide-photo` 改為絕對定位容器；render 時依 `state.slidePhotoPos` 或預設位置放置：

- 預設位置：改善前靠左（`left:0`）、改善後靠右（`right:0`，用 `left:auto` + 外層控制）。採用的做法：`.slide-photos` 為 `position:relative` 容器，兩張照片 `.slide-photo` 為 `position:absolute`；render 時若 `slidePhotoPos[p.id]` 存在 → `style="left:Xpx;top:Ypx"`，否則改善前 `style="left:0;top:0"`、改善後 `style="left:auto;right:0;top:0"`。
- 照片本體加 `data-slide-pos="photoId"` 標記（供拖拽綁定）。

### 3. 綁定（`v4/js/document.js` `bindDocument`）

在 slide 模板下為 `[data-slide-pos]` 綁定 pointer 拖拽（沿用其他模板 `.photo-thumb` 移動 pattern，document.js:265-327）：

- pointerdown → 記錄起始滑鼠座標與起始 `left/top`。
- pointermove → 即時更新 `.slide-photo` 的 `left/top`（限制在容器內）。
- pointerup → 寫入 `state.slidePhotoPos[photoId] = { x, y }`。
- 只改該照片 DOM 樣式，不呼叫 `renderDocument()`。
- 監聽採「無條件註冊 + 事件時檢查 `getTemplate(state.template).id==="slide"`」（沿用先前簡報縮放的修復模式，避免 bound 守衛問題）。

### 4. CSS（`v4/css/base.css` 簡報區段）

```css
.slide-page .slide-photos{position:relative;min-height:60px}
.slide-page .slide-photo{position:absolute}
```

（`.slide-photo` 既有 `flex:1;min-width:0;display:flex;...` 改為 `position:absolute`，移除 flex 影響；`min-height` 確保容器有高度可拖放。）

## 三、不變項目

- 縮放機制（`slidePhotoSize`/`data-slide-resize`/`.slide-photo-frame`）不變。
- 其他模板（generic/safety/quality）照片機制與 `dispX/dispY` 完全不動。
- 照片物件資料結構、IndexedDB 持久化不動。
- 簡報文字編輯、圖表重繪機制不動。

## 四、驗收標準

1. 一頁簡報的改善前/後照片可拖動到版面任意位置。
2. 拖動時只改該照片位置，不影響其他照片/文字/圖表。
3. 調整結果僅本次會話有效：刷新頁面後恢復預設排版（改善前左、改善後右）。
4. 縮放與移動可同時使用（拖動位置、拖手柄縮放互不干擾）。
5. 其他模板照片位置不受影響。
