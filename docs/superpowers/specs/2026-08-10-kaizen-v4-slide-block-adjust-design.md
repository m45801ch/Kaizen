# 改善提案生成器 V4：簡報區塊調整（效益可移動/縮放/調層；其餘固定）設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

前版本讓標題/重點/效益/結語四區塊都可拖動與調層，但實測僅效益圖表可正常移動。本設計調整為：
- **標題、重點列表、結語**三個區塊改為**固定**（不可拖動、移除調層按鈕、恢復原排版）。
- **效益圖表**保留**可移動**、**修復上下層按鈕**、**新增拖拽縮放**（拖角落手柄調大小）。

僅本次會話有效、各版面獨立。

## 二、方案

### 1. 標題/重點/結語固定化（`v4/js/templates/slide/index.js` render）

- 移除這三區塊的 `data-slide-block` 標記、`data-slide-block-z` 調層按鈕、inline `style`（位置/z-index）。
- 保留 contenteditable 編輯（`data-slide-field` 內層 span、`slide-field` class）。
- 恢復原排版：`.slide-title` 置頂、`.slide-points` 靠左、`.slide-conclusion` 置底（回歸 `.slide-page` flow）。

render 範例（title）：
```html
<div class="slide-title"><span class="slide-field" contenteditable="true" data-slide-field="slideTitle">…</span></div>
```

### 2. 效益圖表保留可移動（render）

- `.slide-benefits` 保留 `data-slide-block="benefits"`、inline 位置（`slideBlockPos`）、z-index（`slideBlockZ`）、`data-slide-block-z` 調層按鈕。
- 新增縮放手柄：效益容器內加 `<span class="resize-handle" data-slide-resize-block title="調整尺寸"></span>`。
- 新增 `state.slideBlockSize = {}`（`{[key]: {w,h}}`，僅 benefits 使用）；render 時依 `slideBlockSize` 設容器寬/高（預設不設，由內容撐開）。

### 3. 修復效益調層（`document.js`）

- 效益 z-index 範圍 `1..99`（`slideBlockZ`），與內容（z=1）、照片（z=5）正常比較。
- 調層 handler 維持（`[data-slide-block-z]`）。

### 4. 新增效益縮放（`document.js`）

- `[data-slide-resize-block]` pointer 拖拽（仿照片 `[data-slide-resize]` pattern）：pointerdown → onMove 調整 `.slide-benefits` 的 width/height（min 80px）→ pointerup 寫 `state.slideBlockSize.benefits = {w,h}`；釋放 pointer capture。
- 拖拽移動（`[data-slide-block]`）需排除 `[data-slide-resize-block]`。

### 5. CSS（`v4/css/base.css`）

- `.slide-title`、`.slide-points`、`.slide-conclusion` 移除 `position:absolute`，回歸 flow（移除先前 absolute/cursor/touch-action 規則）。
- `.slide-benefits` 保留 `position:absolute;cursor:grab;touch-action:none`。
- 效益縮放手柄樣式（`.slide-benefits .resize-handle`，仿照片）。

## 三、不變項目

- 照片機制（`slidePhotoPos/slidePhotoSize/slideZ`、拖拽/縮放/調層）完全不動。
- 效益圖表內容（chart）、文字編輯機制不變。
- 其他模板完全不動。
- `data.slide` 內容結構不變。

## 四、驗收標準

1. 標題、重點、結語固定：不可拖動、無調層按鈕、原排版正常。
2. 效益圖表可拖到版面任意位置、可拖縮放手柄調整大小。
3. 效益「↑/↓」按鈕可調整與內容/照片的上下層。
4. 僅本次會話有效：刷新恢復預設。
5. 列印不顯示調層/縮放手柄；列印位置反映拖動結果。
6. 照片機制不受影響。
