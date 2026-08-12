# V4 修復：一頁簡報列印/PDF 照片超出框體

日期：2026-08-10
狀態：Bug 報告 + Root cause 確認

## 問題

一頁簡報編輯完畢，螢幕顯示圖片在框體內；但列印/匯出 PDF 時，照片超出整個框體之外。

## Root Cause

簡報（`.slide-page`）照片是 `position:absolute`（px 座標定位於 `.slide-page`），但**列印時無任何縮放處理**：

- 螢幕：`.doc{max-width:900px;padding:32px 36px}` → 內容寬約 828px。
- 列印 A4 直向：`.doc{padding:18mm 15mm}` → 紙內容寬約 669px（`180mm×96/25.4−11`，見 document.js:152 同源計算）。
- 紙寬（669px）< 簡報設計寬（828px）→ `.slide-page` 被壓窄，但照片 absolute 座標是 px 不隨之縮小 → 超出框體。
- 橫向紙（約 701px 內容寬）接近 828 仍可能略超；整體為縮放缺失。

## 修法（沿用通用模板 `--ps` 縮放機制）

1. **`v4/css/layout.css` `@media print`**：新增簡報列印縮放：
```css
  body.orient-portrait .doc:has(.slide-page) .slide-page{transform:scale(var(--slide-ps,1));transform-origin:top left}
  body.orient-landscape .doc:has(.slide-page) .slide-page{transform:scale(var(--slide-ps,1));transform-origin:top left}
```
（`.slide-page` 保持其自然寬度（block 填滿），僅用 transform 縮放。通用模板用 `.photo-grid{transform:scale(var(--ps))}` 同機制。）

2. **`v4/js/main.js` printBtn**：列印前計算並設定 `--slide-ps`：
```js
  $("printBtn").addEventListener("click",()=>{
    document.title=($("f-title")&&$("f-title").value.trim())||"改善提案表";
    const slide=$(".doc .slide-page");
    if(slide){
      const landscape=document.body.classList.contains("orient-landscape");
      const printW = landscape
        ? Math.round(Math.round(269*96/25.4) - 316) - 20
        : Math.round((Math.round(180*96/25.4) - 11)/2) - 20;
      const zoneW=slide.getBoundingClientRect().width;
      let s = zoneW>0 ? printW/zoneW : 1;
      s = Math.min(1, Math.max(0.3, s));
      slide.style.setProperty("--slide-ps", String(s));
    }
    window.print();
  });
```
說明：`printW` 直向約 669、橫向約 701（與 document.js layoutPhotos 同源）。`zoneW` 為簡報目前渲染寬度（約 828 或更窄）。`scale = printW/zoneW`，下限 0.3 上限 1（不放大）。print 後 `--slide-ps` 保留無害（下次 print 重算）。

3. 列印時簡報若有縮放，`transform-origin:top left` 確保以左上角為基準縮放，照片/區塊隨之縮小在框內。

## 不變

- 通用模板縮放機制（`--ps`/`layoutPhotos`）不變。
- 螢幕顯示完全不變（transform 僅 print media）。
- 其他列印規則不變。

## 驗收

1. 一頁簡報列印/匯出 PDF：照片與所有區塊都在框體內，不超出。
2. 直向、橫向皆正常。
3. 螢幕顯示與先前一致。
4. `node --check v4/js/main.js` 通過。
