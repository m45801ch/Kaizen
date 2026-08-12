# 改善提案生成器 V4：簡報照片全版面移動＋覆蓋＋z-index 設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

一頁簡報（slide）模板的照片目前被限制在 `.slide-photos` 容器（`clamp(220px,26vh,360px)`）內移動，無法覆蓋文字/表格，且拖拽「時好時壞」。本設計讓照片可在**整個 `slide-page` 版面任意拖動**（含標題/重點/效益/結語上方），每張照片有「上移一層/下移一層」按鈕調整與文字/表格的上下層關係，並修復拖拽不穩。僅本次會話有效、各版面獨立（不動照片物件 `dispX/dispY/dispW/dispH`）。

## 二、方案

### 1. 定位基準改為整個版面（`slide/index.js` render + `base.css`）

- 照片 `.slide-photo` 保持 `position:absolute`，但定位基準改為 `.slide-page`（已有 `position:relative`），不再包在 `.slide-photos` 容器內。
- render：照片直接置於 `.slide-page` 下（`slide-page` 內、`photoBlock` 位置不變，但 `.slide-photos` 容器移除，改由 `.slide-photo` 直接 `position:absolute` 於 `.slide-page`）。
- 照片 `z-index` 預設 `5`（高於內容的預設 `auto`/`0`），可覆蓋文字/表格。
- `.slide-photo-frame` 加 `touch-action:none`（杜絕瀏覽器 touch 手勢劫持拖拽）。

### 2. z-index 記憶（`store.js`）

```js
slideZ: {}   // { [photoId]: number }，memory-only
```

render 時照片 `style="...;z-index:'+(d.slideZ && d.slideZ[p.id] || 5)+'"`。

### 3. 調層按鈕（`slide/index.js`）

照片右上角加兩個小按鈕，`data-slide-z="+1"` / `data-slide-z="-1"`：
```html
<span class="slide-z-btns">
  <button type="button" data-slide-z="+1" title="上移一層">↑</button>
  <button type="button" data-slide-z="-1" title="下移一層">↓</button>
</span>
```

`document.js` 綁定 click：調整 `state.slideZ[id] = (state.slideZ[id]||5) + delta`，並只更新該照片的 `style.zIndex`（不重繪整份文件）。

### 4. 拖拽修復（`document.js`）

- 拖拽綁定改掛在 `[data-slide-pos]` 的 `.slide-photo-frame` 照片本體（排除縮放手柄 `[data-slide-resize]` 與調層按鈕 `[data-slide-z]`）。
- 定位基準改為 `.slide-page`：`const page = target.closest(".slide-page")`，`maxX/maxY` 用 `page.clientWidth/Height - target.offsetWidth/Height`。
- 加 `e.button===0`（左鍵）過濾。
- 加 `touch-action:none`（CSS）、`pointercancel`/`lostpointercapture` 清理（已有）。
- 拖拽時只改 `left/top`，不呼叫 `renderDocument()`。

### 5. CSS（`base.css` 簡報區段）

```css
.slide-page .slide-photo{position:absolute;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:grab;z-index:5}
.slide-page .slide-photo:active{cursor:grabbing}
.slide-page .slide-photo-frame{touch-action:none}
.slide-page .slide-z-btns{position:absolute;top:-8px;right:0;display:flex;gap:2px;z-index:2}
.slide-page .slide-z-btns button{width:18px;height:18px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.4);border-radius:4px;background:rgba(15,23,42,.8);color:#fff;cursor:pointer;padding:0}
```
（`.slide-photos` 容器規則移除或改為直接不輸出。）

## 三、不變項目

- 縮放機制（`slidePhotoSize`/`data-slide-resize`/`.slide-photo-frame`）不變。
- 文字編輯（contenteditable + `data-slide-field`）、圖表重繪機制不變。
- 其他模板（generic/safety/quality）照片機制完全不動。
- 照片物件資料結構、IndexedDB 持久化不動。

## 四、驗收標準

1. 照片可在整個 `slide-page` 版面任意拖動（含標題/重點/效益/結語上方），不再被限制在下方照片區。
2. 照片可覆蓋文字/表格；「上移/下移一層」按鈕可調整與內容的上下關係。
3. 拖拽穩定：拖照片本體可拖、拖縮放手柄只縮放、點調層按鈕只調層，互不干擾。
4. 調整結果僅本次會話有效：刷新後恢復預設（改善前左、改善後右、z-index 5）。
5. 縮放與移動、調層可同時使用。
6. 其他模板照片機制不受影響。
