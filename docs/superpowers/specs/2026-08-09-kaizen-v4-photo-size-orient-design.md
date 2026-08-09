# 改善提案生成器 V4：照片自由縮放與 A4 直橫向 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V3（`index.html`）具有兩項功能，V4（`v4/`）尚未移植：

1. **照片尺寸調整**：V3 以「主圖／縮圖寬度」百分比滑桿控制（第一張為 `.main` 佔滿整行、其餘縮圖）。經與使用者討論後，V4 改採**更靈活的作法**：每張照片個別、可拖曳把手自由調整寬度和高度，**拖曳時不需維持原比例**。
2. **A4 直向／橫向**：工具列切換紙張方向，預覽與列印同步改變。

使用者決策：
- 照片尺寸控制：放在**照片區內**（拖曳把手直接加在每張照片上）。
- A4 直橫向：放在**右側文件工具列**（仿 V3，與「列印／匯出 PDF」按鈕並排）。
- 照片顯示方式：**自由調整寬高**，不強制等比例，也不強制裁切正方形。

## 二、照片自由縮放

### 資料結構

每張照片物件（存於 IndexedDB，`state.images[side]` 內）新增兩個欄位：

```js
{ id, name, dataUrl, mime, side, w, h, overlay, dispW, dispH }
// dispW, dispH: 顯示寬高（px），可省略；省略時依原比例計算預設
```

`persistImages()` 現已整包存入 IndexedDB，因此加欄位即自動持久化，不需改動儲存邏輯。

### 預設尺寸

照片無 `dispW/dispH` 時，依原圖比例計算：
- 寬度固定 260px。
- 高度 = `round(260 * (h / w))`，最小 40px。

### 版面改動

- `v4/css/layout.css` 的 `.photo-grid` 由 `display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr))` 改為 **flex-wrap**（仿 V3）：
  - `.photo-grid{display:flex;flex-wrap:wrap;gap:9px}`
  - `.photo-thumb{flex:0 0 auto;width:var(--pw,260px);height:var(--ph,auto);...}`（實際寬高由 inline style 或 CSS 變數控制）
  - 移除 `aspect-ratio:1/1`，`.photo-thumb img` 改為 `object-fit:contain`（顯示完整照片，不裁切）。
- `.photo-thumb.main`（第一張佔整行）的概念**不再沿用**：每張照片皆可個別調整。
- 列印樣式同步更新：照片以設定尺寸輸出，縮放把手隱藏。

### 拖曳把手

- 每張 `.photo-thumb` 渲染一個右下角縮放把手（`.resize-handle`），游標移上顯示，列印時隱藏。
- 用 Pointer Events 實作（pointerdown/pointermove/pointerup）：
  - pointerdown 在把手上：開始縮放，記錄起點與照片初始尺寸。
  - pointermove：更新該照片的 `dispW/dispH`（最小 40px，最大不超過照片區寬度），並直接寫入該照片 DOM 的 inline 寬高（**不整頁重渲染**，避免拖曳卡頓）。
  - pointerup：呼叫 `persistImages()` 記憶，並更新 `state.images` 內的照片資料。
- 觸碰裝置：Pointer Events 原生支援 touch，不需額外處理。

## 三、A4 直向／橫向

### UI

- `v4/index.html` 工具列新增下拉選單（放在「列印／匯出 PDF」按鈕旁）：
  ```html
  <select id="orientSel" class="btn btn-outline btn-sm" title="選擇紙張方向">
    <option value="portrait">A4 直向</option>
    <option value="landscape">A4 橫向</option>
  </select>
  ```
  （樣式仿 V3 的 `.orient-sel`，可自行調整為不影響工具列排版的外觀。）

### 邏輯（`v4/js/main.js` 或新 `v4/js/orient.js`）

- 讀取：`localStorage.getItem(STORE.orient) === "landscape"`。
- 套用：`document.body.classList.toggle("orient-landscape", orient === "landscape")`。
- 橫向時注入 `<style>@page{size:A4 landscape;margin:0}</style>`（`<style id="orientStyle">`），直向時移除（V4 的 `layout.css` 已有 `@page{size:A4;margin:0}` 作為直向基準）。
- 切換時：寫入 `STORE.orient`（`kai.gen.orient.v1`，與 V3 相同 key，使用者既有設定可沿用）。

### CSS（`v4/css/layout.css`）

仿 V3 橫向版面，使用 grid 配置：

```css
body.orient-landscape .doc{max-width:1180px}
body.orient-landscape .doc-title{font-size:34px}
body.orient-landscape .kaizen-pair{gap:20px}
body.orient-landscape .doc{display:grid;grid-template-columns:1fr 320px;gap:18px}
body.orient-landscape .doc-header{grid-column:1/-1}
body.orient-landscape .kaizen-pair{grid-column:1;grid-row:2;margin-top:6px}
body.orient-landscape .benefit-box{grid-column:2;grid-row:2;margin-top:6px;align-self:stretch}
body.orient-landscape .benefit-cols{grid-template-columns:1fr}
body.orient-landscape .benefit-col{border-right:none;border-bottom:1px solid var(--line)}
body.orient-landscape .benefit-col:last-child{border-bottom:none}
```

加上 `@media print` 對應版本（含 `grid-template-columns:1fr 300px`、`benefit-cols:1fr!important` 等）。簡報模板（`.slide-page`）不受影響。

## 四、資料流

- 照片 `dispW/dispH`：存於 IndexedDB（`persistImages()`），隨照片本體保存。
- A4 方向：存於 localStorage（`STORE.orient`，與 V3 共用 key）。

## 五、驗收標準

1. 每張照片可拖曳右下角把手**獨立調整寬度和高度**（不等比），鬆開後刷新頁面仍保留尺寸。
2. 列印／PDF 中照片以自訂尺寸輸出，縮放把手不出現。
3. 工具列可切換 A4 直向／橫向，預覽與列印同步改變，刷新後保留。
4. 既有照片（無 `dispW/dispH`）顯示等比預設尺寸（寬 260px）。
5. 照片顯示完整不裁切（`object-fit:contain`）。
