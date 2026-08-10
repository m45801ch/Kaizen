# 改善提案生成器 V4：一頁簡報長條圖（結合效益說明）設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

「一頁簡報」（slide）模板目前只顯示 AI 生成的文字（標題、重點、效益、結語）與照片，無圖表。本設計在簡報中加入**長條圖**，且圖表**直接結合 AI 生成的三條效益說明**：AI 在每條效益文字中填入一個百分比，render 自動抽出百分比作為長條圖比例，效益文字本身作為標籤。同源、結合，不需 AI 另回傳分開的圖表資料。

## 二、方案

修改 `v4/js/prompts.js`、`v4/js/templates/slide/index.js`、`v4/css/base.css`（均小改動）。

### 1. AI prompt（`prompts.js` `buildSlidePrompt`）

調整效益規則：要求每項效益文字**包含一個百分比數字**（AI 自行判斷達成度，0-100）。

- JSON 範例改為：
  ```json
  { "slideTitle":"…", "keyPoints":["…","…","…"], "benefits":["減少停機 50%","節省維修成本 30%","提升產能效率 20%"], "conclusion":"…" }
  ```
- 規則補充：「每項效益需包含一個百分比數字（如 50%），代表該面向的達成度（0-100），AI 自行判斷填入。」

### 2. 簡報 render（`slide/index.js`）

- 讀 `s.benefits`（3 條）。
- 用正則 `/(\d+(?:\.\d+)?)\s*%/` 從每條效益文字抽百分比；抽不到該條則回退均分值（100/條數）。
- 產生**長條圖**（純 SVG，免外部庫）：
  ```js
  function gaBarChart(benefits){
    const colors=["#F2B705","#E8590C","#D63426"];
    const vals = benefits.map(b=>{
      const m = /(\d+(?:\.\d+)?)\s*%/.exec(String(b));
      return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : Math.round(100/benefits.length);
    });
    const barW = Math.max(8, 260/benefits.length);
    const bars = benefits.map((b,i)=>{
      const h = Math.max(4, Math.round(vals[i]/100*120));
      const y = 130 - h;
      return '<g><rect x="'+(i*barW+8)+'" y="'+y+'" width="'+(barW-6)+'" height="'+h+'" fill="'+colors[i%3]+'" rx="2"></rect>'+
        '<text x="'+(i*barW+barW/2+2)+'" y="142" text-anchor="middle" fill="#E2E8F0" font-size="11">'+
        esc(vals[i])+'%</text></g>';
    }).join("");
    const labels = benefits.map((b,i)=>'<div class="sc-label" style="--sc:'+colors[i%3]+'">'+esc(b)+"</div>").join("");
    return '<div class="slide-chart">'+
      '<div class="sc-cap">效益達成度</div>'+
      '<svg viewBox="0 0 280 150" class="sc-svg">'+bars+"</svg>"+
      '<div class="sc-labels">'+labels+"</div>"+
    "</div>";
  }
  ```
  - 長條圖：垂直長條（高度依百分比 0-100 → 0-120px），三色（黃/橙/紅），頂部或下方顯示百分比。
  - 效益文字作為圖表下方的標籤列（含色點圖例）。
- render 中，將 `slide-benefits` 區塊改為顯示 `gaBarChart(s.benefits)`（取代原本的 `sb-item` 列表）；或保留效益文字並在下方加圖表。採用：**以圖表結合** — 效益區顯示長條圖，長條圖下方標籤即效益文字（取代原 `sb-item` 純文字列）。
- 無 `benefits`（空陣列）時不顯示圖表（維持現狀）。

### 3. CSS（`base.css` 簡報區段）

```css
.slide-page .slide-chart{border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.06);padding:10px 12px}
.slide-page .sc-cap{font-size:11px;letter-spacing:.16em;color:#93C5FD;font-weight:600;margin-bottom:4px}
.slide-page .sc-svg{width:100%;height:auto;display:block}
.slide-page .sc-labels{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px}
.slide-page .sc-label{font-size:12px;color:#E2E8F0;display:inline-flex;align-items:center;gap:6px}
.slide-page .sc-label::before{content:"";width:10px;height:10px;border-radius:2px;background:var(--sc);flex-shrink:0}
```

## 三、不變項目

- 照片區、簡報文字編輯（另案）、AI 其他欄位、其他模板、列印機制不變。
- `data.slide` 結構不變（仍為 `{ slideTitle, keyPoints, benefits, conclusion }`），無新增欄位。

## 四、驗收標準

1. 生成一頁簡報後，效益區顯示長條圖（3 根長條，黃/橙/紅），每根高度對應效益文字中的百分比。
2. 效益文字作為圖表下方標籤顯示（含色點圖例）。
3. 效益文字含百分比（如「減少停機 50%」）時，長條高度即該百分比；無百分比則均分。
4. 照片仍正常顯示；簡報整體版面不重疊。
5. 列印/PDF 輸出含長條圖。
