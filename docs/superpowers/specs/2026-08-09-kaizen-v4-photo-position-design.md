# 改善提案生成器 V4：照片自由定位＋移動＋置中 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

目前「改善前/後」照片以 flex-wrap 格子流式排列，拖曳右下角把手只能調整大小（`dispW/dispH`）。當照片較小、未填滿整個區域時，無法調整它在區域內的位置，也無法置中。

本設計讓照片改為**自由定位**：每張照片可在區域內任意拖動位置，並有「置中」按鈕把它放到區域正中央。多張照片各自可移動/置中（可能重疊）。

## 二、方案

修改 `v4/js/templates/shared.js`、`v4/js/document.js`、`v4/css/layout.css`（僅此三檔）。

### 1. 資料模型

照片物件新增兩個欄位（隨 IndexedDB 持久化，`persistImages()` 整包存入，不需改儲存邏輯）：
```js
{ id, name, dataUrl, mime, side, w, h, overlay, dispW, dispH, dispX, dispY }
// dispX, dispY: 照片在區域內的位置（px），省略時由 render 自動計算
```

### 2. 版面改為自由定位（CSS + shared.js）

- `layout.css`：
  - `.photo-grid` 改為 `position:relative`（移除 `display:flex;flex-wrap:wrap`，改為區塊）。
  - `.photo-thumb` 改為 `position:absolute`；`left/top/width/height` 由 inline 設定；保留 `flex:0 0 auto` 移除（不再需要）。
  - `.photo-zone` 維持 `padding:12px`。
  - 列印區塊 `.photo-grid`/`.photo-thumb` 同步調整（絕對定位、inline 座標列印）。
- `shared.js photoZone`：每張 `.photo-thumb` 輸出 `style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"`。若有 `dispX/dispY` 用之，否則 `x=y=0`（實際預設位置由 document.js render 後計算，見 §4）。並加入「置中」按鈕 `data-center`。

### 3. 拖動移動（document.js）

- 在 `bindDocument` 內新增照片本體拖動（與縮放把手並存）：
  - `pointerdown` 於 `.photo-thumb` 本體（`e.target.closest(".photo-thumb")` 且 `!e.target.closest(".resize-handle,.remove,.edit-btn,[data-center]")`）→ 開始移動，記錄起點 `clientX/Y` 與照片起始 `dispX/dispY`（或目前 offsetLeft/Top）。
  - `pointermove`：更新該照片 inline `left/top`（clamp 於區域內：0 ~ 區域寬-照片寬、0 ~ 區域高-照片高）。
  - `pointerup`：寫回 `dispX/dispY` 並 `persistImages()`。
  - 用 `setPointerCapture`（與縮放把手一致）。
- clamp 用的區域寬高：`zone.clientWidth/clientHeight`（`photo-zone`），扣除 padding。

### 4. 預設位置計算（document.js）

- `renderDocument()` 在 `doc.innerHTML = tpl.render(...)` 之後、`bindDocument()` 之前，對每個照片區執行 `layoutPhotos(side)`：
  - 對每張無 `dispX/dispY` 的照片，依「目前區域內容寬度」由左而右、超出換行排列（`x` 累加 `width+gap`；`y` 換行後累加上一列最大高 `maxH+gap`）。
  - 計算 `gridHeight = max(所有照片 bottom, 64)`，設 `.photo-grid` 的 inline `height`。
  - 有 `dispX/dispY` 的照片直接套用其位置，但仍參與 `gridHeight` 計算。
- 此計算在每次 render 重跑，確保新增/移除照片後預設位置合理。

### 5. 置中按鈕（document.js + shared.js）

- `shared.js` 每張照片加 `<button type="button" class="center-btn" data-center="<id>" title="置中">◎</button>`（與 remove/edit-btn 同級樣式）。
- `bindDocument` 事件委派：點 `[data-center]` → 找照片，設 `dispX = round((區域內容寬 - 照片寬)/2)`、`dispY = round((區域內容高 - 照片高)/2)`（至少 0），`renderDocument()` + `persistImages()`。
- 列印時 `data-center` 按鈕隱藏（比照 remove/edit-btn）。

### 6. 不變項目

- 縮放把手（`dispW/dispH`）、`object-fit:fill`、移除/編輯按鈕、拖曳上傳、`renderComposite`、列印照片輸出方式不變。
- `state.images` 資料結構只加欄位，不破壞既有資料（舊照片無 `dispX/dispY` → 自動計算預設位置）。

## 三、資料流

- `dispX/dispY` 存於照片物件，`persistImages()`（IndexedDB）整包存入。
- 位置計算與渲染於每次 `renderDocument()` 重新套用。

## 四、驗收標準

1. 照片可在區域內自由拖動位置（clamp 於區域內）。
2. 點「置中」照片移到區域正中央。
3. 多張照片各自可拖動/置中（可能重疊）。
4. 刷新後位置保留（IndexedDB）。
5. 列印輸出位置正確；置中按鈕與其他操作鈕不出現在列印。
6. 既有照片（無 dispX/dispY）自動排列顯示正常。
