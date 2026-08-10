# 改善提案生成器 V4：一頁簡報圖片拖拽縮放 設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

一頁簡報（slide）模板的改善前/後照片目前只是靜態 `<img>`（被 CSS `max-width/max-height:100%` 自動填滿），無法調整大小；其他模板（generic/safety/quality）的縮放是透過照片物件的 `dispW/dispH`。本設計讓簡報照片可透過**角落縮放手柄拖拽**自由調整大小，且**僅本次會話有效**（刷新恢復預設）、**各版面獨立記憶**（不動 `dispW/dispH`、不影響其他模板）。

## 二、方案

### 1. 記憶（memory-only，不持久化）

新增 `state.slidePhotoSize`（僅存記憶體，不寫 localStorage/IndexedDB）：

```js
slidePhotoSize: {}   // { [photoId]: { w, h } }
```

「各版面獨立」：slide 模板**只讀**此 map，完全不讀寫照片物件的 `dispW/dispH`。

### 2. slide 模板 render（`v4/js/templates/slide/index.js`）

照片區改為可縮放容器：

```html
<div class="slide-photo">
  <span class="slide-photo-tag">改善前</span>
  <div class="slide-photo-frame" style="width:240px;height:180px">
    <img src="…" alt="改善前">
    <span class="resize-handle" data-slide-resize="{photoId}" title="調整尺寸"></span>
  </div>
</div>
```

- 預設尺寸：寬 240px、高依 `p.h/p.w` 比例計算（`Math.max(40, Math.round(240*ratio))`）。
- 若 `state.slidePhotoSize[p.id]` 存在 → 以該尺寸取代預設。
- `data-slide-resize` 標記縮放手柄（避免與其他模板的 `data-resize` 衝突）。

### 3. 綁定（`v4/js/document.js` `bindDocument`）

在 slide 模板下（`getTemplate(state.template).id==="slide"`）為 `[data-slide-resize]` 綁定 pointer 拖拽（沿用既有照片縮放 pattern，見 document.js:307-337 的 resize-handle 實作）：

- pointerdown → 記錄起始滑鼠座標與起始尺寸。
- pointermove → 即時更新 `.slide-photo-frame` 的 `width/height`（限制最小 40px、最大區塊寬度）。
- pointerup → 寫入 `state.slidePhotoSize[photoId] = { w, h }`。
- **只改該照片 frame 的 DOM 樣式**，不呼叫 `renderDocument()`（避免打斷正在編輯的簡報文字/圖表）。

### 4. CSS（`v4/css/base.css` 簡報區段）

```css
.slide-page .slide-photo{display:flex;flex-direction:column;align-items:center;gap:6px}
.slide-page .slide-photo-frame{position:relative;overflow:hidden;border-radius:8px;background:rgba(255,255,255,.06)}
.slide-page .slide-photo-frame img{width:100%;height:100%;object-fit:contain;display:block}
.slide-page .slide-photo-frame .resize-handle{position:absolute;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;background:rgba(255,255,255,.5);border-top-left-radius:8px}
```

## 三、不變項目

- 其他模板（generic/safety/quality）照片機制與 `dispW/dispH` 完全不動。
- 照片物件資料結構、IndexedDB 持久化不動。
- 簡報文字編輯、圖表重繪機制不動。

## 四、驗收標準

1. 一頁簡報的改善前/後照片角落有縮放手柄，可拖拽自由調整大小（最小 40px）。
2. 調整結果僅本次會話有效：刷新頁面後恢復預設尺寸。
3. 在簡報調大小後切到其他模板，其他模板的照片尺寸不受影響（各版面獨立）。
4. 其他模板調整大小後回到簡報，簡報照片仍為簡報自己的尺寸設定。
5. 拖拽時不中斷簡報文字/圖表的編輯狀態。
