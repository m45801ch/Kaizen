# 改善提案生成器 V4：簡報文字/表格區塊拖拽移動＋調層級 設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

一頁簡報（slide）模板的照片已可全版面移動與調層級。本設計讓**標題、重點列表、效益圖表（表格）、結語**四個區塊各自成為可獨立拖動的區塊，可移動到版面任意位置，並有「上移/下移一層」按鈕調整與照片及其他區塊的上下層關係。僅本次會話有效、各版面獨立（不動 `data.slide` 內容）。

## 二、方案

### 1. 記憶（memory-only，不持久化）

`v4/js/store.js` 新增：

```js
slideBlockPos: {},   // { [blockKey]: { x, y } }
slideBlockZ: {}      // { [blockKey]: number }
```

`blockKey` 固定：`title`、`points`、`benefits`、`conclusion`。

### 2. slide render（`v4/js/templates/slide/index.js`）

四個區塊各加 `data-slide-block="<key>"` 標記，改為 `position:absolute`（相對於 `.slide-page`）：

- render 時若有 `slideBlockPos[key]` → `style="left:Xpx;top:Ypx;z-index:Z"`；否則維持原本排版位置（標題置頂、重點/效益在 body 區、結語置底）但加 `position:absolute` 與對應的 `left/top` 預設值。
- z-index：`slideBlockZ[key] ?? 1`（內容預設 1）。
- 每區塊加調層按鈕：
  ```html
  <span class="slide-z-btns"><button data-slide-block-z="+1" title="上移一層">↑</button><button data-slide-block-z="-1" title="下移一層">↓</button></span>
  ```
- 區塊結構：`.slide-title`、`.slide-points`（重點 ul）、`.slide-benefits`（效益圖表）、`.slide-conclusion` 各包一層 `data-slide-block` 容器，或直接在原元素上加 `data-slide-block` + `position:absolute`。

採用：**直接在原元素上加 `data-slide-block` 與 `position:absolute`**（`.slide-title`、`.slide-points`、`.slide-benefits`、`.slide-conclusion`），不另包容器；`.slide-body` 保持 grid 但因其子元素（points/benefits）變 absolute 後，body 需 `position:relative` 且高度由內容撐起，或改用明確定位。

### 3. 綁定（`v4/js/document.js` `bindDocument`）

仿照片拖拽/調層 handler：

- **拖拽**：`[data-slide-block]` 用 pointer pattern（無條件註冊 + `if(getTemplate(state.template).id!=="slide") return;`），`e.button===0`、排除 `[data-slide-z]`/`[data-slide-block-z]`/`[data-slide-resize]` 子元素；拖拽基準 `.slide-page`；pointerup 寫 `state.slideBlockPos[key]`；釋放 pointer capture（`hasPointerCapture`+`releasePointerCapture`）。
- **調層**：click 於 `[data-slide-block-z]` → `state.slideBlockZ[key] = clamp(1..99, cur+delta)` + 更新 `style.zIndex`（`cur = state.slideBlockZ[key] ?? 1`）。
- 照片的拖拽/調層 handler 不變。

### 4. CSS（`v4/css/base.css` 簡報區段）

- `.slide-title`、`.slide-points`、`.slide-benefits`、`.slide-conclusion` 加 `position:absolute;cursor:grab;touch-action:none`。
- `.slide-page` 設固定/可縮高度（如 `min-height:70vh` 或 `height:clamp(...)`）作為 drag stage，避免區塊拖出後版面崩壞。
- `.slide-body` 設 `position:relative`（因子元素變 absolute）。
- 調層按鈕 `.slide-z-btns` 樣式沿用照片的（已有）。
- `@media print` 隱藏調層按鈕（已有 `.slide-page .slide-z-btns` print 規則）。

### 5. 預設位置（未拖動時）

維持原排版近似值：
- `.slide-title`：`left:36px;top:28px`（配合 `.slide-page` padding）。
- `.slide-points`：`left:36px;top:96px`。
- `.slide-benefits`：`left:auto;right:36px;top:96px`（靠右）。
- `.slide-conclusion`：`left:36px;bottom:28px`。

## 三、不變項目

- 照片機制（`slidePhotoPos/slidePhotoSize/slideZ`、拖拽/縮放/調層）完全不動。
- 文字編輯（contenteditable + `data-slide-field`）、圖表重繪機制不變。
- 其他模板（generic/safety/quality）完全不動。
- `data.slide` 內容結構不變。

## 四、驗收標準

1. 標題、重點、效益圖表、結語四個區塊可各自拖到版面任意位置。
2. 每區塊「上移/下移一層」按鈕可調整與其他區塊/照片的上下層關係（照片預設 z5、內容預設 z1）。
3. 拖動與文字編輯不衝突：拖區塊空白處移動、點文字可編輯。
4. 調整僅本次會話有效：刷新恢復預設排版。
5. 列印不顯示調層按鈕；列印位置反映拖動結果。
6. 照片機制不受影響。
