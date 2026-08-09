# 改善提案生成器 V4：列印照片等比縮放 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

照片以螢幕座標絕對定位排版（`dispX/dispY`）。列印時 A4 版面較窄，照片會超出欄位被右側裁切。先前嘗試「列印時回流式排列」（Option A），但會失去使用者螢幕上的手動排版。本設計改用 **Option B：列印時等比縮放**，保留排版位置並縮小到符合列印欄寬。

## 二、方案

修改 `v4/js/document.js`（`layoutPhotos`）與 `v4/css/layout.css`（`@media print`）。

### 1. `layoutPhotos` 計算並寫入縮放比例（`document.js`）

每次 `layoutPhotos(side)` 計算照片位置後：

- 已知 `zoneW`（螢幕內容寬，已用於排版）。
- 依方向計算「列印欄內容寬」`printW`：
  - 直向（非 landscape）：`printW = (180mm→px - 11px) / 2 - 20px`。
    - 180mm 換算 px：`Math.round(180 * 96 / 25.4)`。
  - 橫向（landscape）：`printW = (269mm→px - 316px) - 20px`。
    - 269mm = 297mm − 28mm（左右邊距 14mm×2）；再扣 `.doc` grid 的 `300px` 效益欄 + 16px gap。
- `s = printW / zoneW`，夾在 `0.3 ~ 1`（避免極端值）。
- 在 `grid` 上設定 CSS 變數：
  - `grid.style.setProperty("--ps", s)`（縮放比例）。
  - `grid.style.setProperty("--ph", String(maxBottom))`（目前 grid 高度，px）。
- 若 `zoneW` 無法取得（grid 無 zone），跳過（不設變數，列印時 scale 預設 1）。

### 2. 列印 CSS 套用縮放（`layout.css` `@media print`）

把 Option A 的 `position:static` / flex-wrap 改回**絕對定位**：

```css
  .photo-grid{position:relative;min-height:0;overflow:visible;transform:scale(var(--ps,1));transform-origin:top left;height:calc(var(--ph,64px) * var(--ps,1))}
  .photo-thumb{position:absolute;border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
```

- `transform:scale(var(--ps,1))`：列印時整張照片區以左上角為原點等比縮放。
- `height:calc(var(--ph,64px) * var(--ps,1))`：grid 高度同步縮放，避免多餘大塊空白。
- `.photo-thumb` 維持絕對定位（沿用螢幕座標，經 `transform` 一併縮放）。
- 螢幕不受影響（`--ps/--ph` 只在 print media 套用）。

## 三、不變項目

- 螢幕拖動/置中/縮放、預設位置計算、`dispX/dispY/dispW/dispH` 資料結構完全不變。
- 其他列印樣式（邊距、kaizen-pair 兩欄、效益欄等）不變。

## 四、驗收標準

1. 螢幕排版（含手動拖動/置中位置）在列印/PDF 中**等比縮放保留**，不裁切、右側有間距。
2. 直向與橫向都正確。
3. 縮放後無多餘大塊空白（grid 高度同步縮放）。
4. 螢幕顯示不受影響。
