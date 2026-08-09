# 改善提案生成器 V4：圖片編輯器視窗放大 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 圖片編輯器（點照片「✎」開啟的模態框）目前太小：`.editor-card` 僅 `width:min(1000px,96vw)`、`max-height:92vh`，且 `openEditor` 的縮放比例 `s = Math.min(1, maxW/寬, maxH/高)` **上限為 1（永不放大）**，導致小圖（如壓縮後 300px 寬的照片）在深色畫布區只顯示成小小的圖，難以進行視覺編輯。

目標：**加大視窗至接近全螢幕，並讓圖片自動放大填滿可用空間**（超出時可捲動），提升編輯體驗。

## 二、方案

### 1. CSS（`v4/css/base.css`）

- `.editor-card`：改為
  ```css
  .editor-card{background:var(--surface);border-radius:14px;width:min(1200px,98vw);height:min(94vh);display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-md)}
  ```
  （`max-height:92vh` → `height:min(94vh)`；`width:min(1000px,96vw)` → `width:min(1200px,98vw)`）

- `.editor-canvas`：改為
  ```css
  .editor-canvas{background:#fff;box-shadow:var(--shadow-md);cursor:crosshair;margin:auto}
  ```
  （移除 `max-width:100%;max-height:100%`，讓畫布以實際尺寸顯示；`margin:auto` 使圖片小於可用空間時置中、大於時可捲動不裁切。）

- `.editor-canvas-wrap` 已為 `overflow:auto`，不需變更（畫布超出時自然捲動）。

### 2. JS（`v4/js/editor/editor.js`）

`openEditor` 內縮放計算（目前約第 149-153 行）：

```js
    const maxW=(wrap?wrap.clientWidth:760)-40;
    const maxH=(wrap?wrap.clientHeight:560)-40;
    const s=Math.min(1,maxW/img.width,maxH/img.height);
```

改為「填滿可用空間、上限 4 倍」：

```js
    const maxW=(wrap?wrap.clientWidth:1200)-40;
    const maxH=(wrap?wrap.clientHeight:760)-40;
    const MAX=4;
    let s=Math.min(MAX,maxW/img.width,maxH/img.height);
    if(s<=0) s=1;
```

即：小圖最多放大 4 倍填滿可用空間（避免過度馬賽克）；大圖仍縮小至可用範圍；縮放比例異常（≤0）時退回 1。

畫布寬高設定維持 `c.width=img.width*s; c.height=img.height*s;`（含旋轉時互換），與現行一致。

## 三、不變項目

- 編輯工具（框線／塗鴉／箭頭／文字／裁剪／旋轉）、疊加層、復原、完成／取消、列印合成（`renderComposite`）邏輯完全不動。
- 繪製座標轉換 `toImg` 以 `getBoundingClientRect` 計算，捲動後仍正確，不需修改。

## 四、驗收標準

1. 開啟編輯視窗 → 視窗接近全螢幕，圖片自動放大填滿可用空間（小圖放大、大圖縮小適配）。
2. 圖片過大時畫布區可捲動，繪製／框線／裁剪座標正確。
3. 完成／取消、所有編輯工具（含旋轉後座標）運作正常。
