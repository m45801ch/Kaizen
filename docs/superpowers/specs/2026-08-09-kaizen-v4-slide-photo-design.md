# 改善提案生成器 V4：一頁簡報整合照片 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

目前「一頁簡報」（slide）模板只顯示 AI 生成的文字（標題、重點、效益、結語），**無法整合使用者在改善前/後上傳的照片**。本設計讓簡報版面加入照片顯示：有照片時顯示（改善前/後各一區，等比不壓扁），無照片時維持純文字版面。

（補充：使用者也釐清了「自動填寫＋正式措辭」與「生成一頁簡報」是兩個不同按鈕；本設計專注簡報照片整合。）

## 二、方案

修改 `v4/js/templates/slide/index.js`（render）與 `v4/css/layout.css` 或 `v4/css/base.css`（簡報照片樣式）。不需改 `generateSlide`/`data.slide`（照片由模板直接讀 `d.photos`，與其他模板共用 `state.images`）。

### 1. slide 模板 render 加入照片區

目前 slide render（`v4/js/templates/slide/index.js`）：
```js
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title">'+esc(s.slideTitle||d.title||"改善提案")+'</div>'+
      '<div class="slide-body">'+
        '<ul class="slide-points">'+…+"</ul>"+
        '<div class="slide-benefits">'+…+"</div>"+
      "</div>"+
      '<div class="slide-conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
```

改為：在 `slide-page` 內、`slide-body` 之後加入照片區（僅在有照片時輸出）：
```js
    const photosBefore = (d.photos&&d.photos.before)||[];
    const photosAfter = (d.photos&&d.photos.after)||[];
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+
        (photosBefore.length?'<div class="slide-photo"><span class="slide-photo-tag">改善前</span><img src="'+esc(photosBefore[0].previewDataUrl||photosBefore[0].dataUrl)+'" alt="改善前"></div>':"")+
        (photosAfter.length?'<div class="slide-photo"><span class="slide-photo-tag">改善後</span><img src="'+esc(photosAfter[0].previewDataUrl||photosAfter[0].dataUrl)+'" alt="改善後"></div>':"")+
      "</div>"
      : "";
```
並把 `photoBlock` 插入回傳字串（`slide-body` 之後、`slide-conclusion` 之前或之後，視版面）。每邊取第一張照片。

### 2. 簡報照片樣式

CSS 加入（放 `base.css` 的簡報區段，`slide-page` 相關）：
```css
.slide-photos{display:flex;gap:14px;flex:1;min-height:0}
.slide-photo{
  flex:1;min-width:0;border:1px solid rgba(255,255,255,.18);border-radius:10px;
  background:rgba(255,255,255,.06);padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden;
}
.slide-photo img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;display:block}
.slide-photo-tag{font-size:11px;letter-spacing:.14em;color:#93C5FD;font-weight:600}
```
- 圖片 `object-fit:contain`、`max-width/max-height:100%` → 等比縮放不壓扁、不裁切。
- `.slide-photos` `flex:1` → 佔滿剩餘空間，與 `.slide-body` 分配簡報高度。
- 單邊有照片時另一側留空，照片置中於各自半區。

### 3. 列印

簡報列印沿用現有 `slide-page` 樣式；新增 `.slide-photos/.slide-photo/img/.slide-photo-tag` 在列印時自動生效（無需 `@media print` 特殊處理，因 `base.css` 簡報樣式非 print-scoped）。

## 三、不變項目

- 簡報文字生成（`generateSlide`、`data.slide`、prompt）邏輯不變。
- 照片上傳/編輯/拖曳/置中/縮放、其他三個模板、列印機制不變。
- 無照片時簡報維持純文字版面（photoBlock 為空字串）。

## 四、驗收標準

1. 在簡報模板上傳改善前/後照片 → 簡報版面顯示照片（每邊取第一張，含「改善前/改善後」標籤、等比不壓扁）。
2. 只有單邊照片 → 該側顯示，另一側留空，照片置中。
3. 無照片 → 簡報維持純文字、版面填滿正常。
4. 點「生成一頁簡報」→ 文字填入且照片保留顯示。
5. 列印/PDF 簡報含照片。
