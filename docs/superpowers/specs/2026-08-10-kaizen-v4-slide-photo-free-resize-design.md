# 改善提案生成器 V4：簡報照片自由縮放＋一鍵恢復原尺寸 設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

一頁簡報（slide）模板的照片縮放目前因 `.slide-photo-frame img{object-fit:contain}` 讓圖片維持原比例顯示，即使 frame 容器自由改變寬高，圖仍不變形 — 看起來「照比例縮放」。本設計改為**自由縮放**（圖片隨容器拉伸變形，同通用模板），並新增「⟳ 恢復原尺寸」小按鈕，點擊回到「寬 240px、高按原圖比例」的預設尺寸。僅本次會話有效。

## 二、方案

### 1. 圖片隨容器拉伸（`v4/css/base.css`）

`.slide-page .slide-photo-frame img`（第 173 行）：
```css
.slide-page .slide-photo-frame img{width:100%;height:100%;object-fit:fill;display:block}
```
（`object-fit:contain` → `fill`：圖填滿 frame、隨容器變形。縮放 handler 本身已是自由縮放，不需改。）

### 2. 恢復按鈕（`v4/js/templates/slide/index.js` render）

照片內、調層按鈕旁加恢復按鈕：
```html
<button type="button" data-slide-reset-size title="恢復原尺寸">⟳</button>
```
照片物件已有 `p.w`/`p.h`（原圖寬高）。

### 3. 恢復 handler（`v4/js/document.js`）

- `[data-slide-reset-size]` click：計算原圖比例尺寸 `w=240`、`h=Math.max(40, Math.round(240*(p.h/p.w)))` → 更新該照片 `.slide-photo-frame` 的 width/height → 寫 `state.slidePhotoSize[id] = {w,h}`。
- 照片拖拽/縮放/調層的 pointerdown handler 排除此按鈕（`[data-slide-reset-size]`）。
- 照片物件取法：`state.images.before/after` 中依 `photoId` 找（照片 `data-slide-photo`/`data-slide-pos` 帶 id）。

### 4. 不變

- 照片拖拽、調層、效益縮放機制完全不動。
- 其他模板、`data.slide` 內容結構不變。
- 縮放 handler（document.js:384-389 寬高獨立）已是自由縮放，維持。

## 三、驗收標準

1. 照片拖縮放手柄可自由改變寬高，圖片隨之拉伸變形（不需維持比例）。
2. 照片上有「⟳ 恢復原尺寸」按鈕，點擊後回到寬 240px、高按原圖比例的尺寸。
3. 恢復後仍可自由縮放。
4. 拖照片/縮放/調層/恢復四者互不干擾。
5. 僅本次會話有效：刷新恢復預設。
6. 其他模板（通用模板）照片機制不受影響。
