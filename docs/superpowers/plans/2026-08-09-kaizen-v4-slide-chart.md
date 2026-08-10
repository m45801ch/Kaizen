# V4 一頁簡報長條圖（結合效益說明）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一頁簡報效益區加入長條圖，比例直接取自 AI 效益文字中的百分比（結合，不分開），純 SVG 免外部庫。

**Architecture:** `prompts.js` 調整效益規則（每條含百分比）；`slide/index.js` render 從 `s.benefits` 用正則抽百分比產生垂直長條 SVG，效益文字作標籤；`base.css` 加圖表樣式。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/prompts.js`、`v4/js/templates/slide/index.js`、`v4/css/base.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。
- 百分比抽取：`/(\d+(?:\.\d+)?)\s*%/` 於每條效益文字；抽不到該條回退 `Math.round(100/benefits.length)`；抽到則 `Math.max(0,Math.min(100,parseFloat(m[1])))`。
- 長條圖：垂直長條，高 `Math.max(4,Math.round(vals[i]/100*120))`（0-100% → 0-120px），三色 `["#F2B705","#E8590C","#D63426"]`，SVG `viewBox="0 0 280 150"`。
- 效益區以長條圖取代原本 `sb-item` 純文字列表；效益文字作為 `.sc-label` 標籤（含色點圖例）。
- 無 benefits（空陣列）不顯示圖表。
- `data.slide` 結構不變；其他模板、列印機制不動。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: AI prompt 效益含百分比

**Files:**
- Modify: `v4/js/prompts.js`（buildSlidePrompt）

**Interfaces:**
- Produces: AI 回傳的 `benefits` 每條含百分比（如「減少停機 50%」）。

- [ ] **Step 1: 調整 buildSlidePrompt**

Modify `v4/js/prompts.js`：在 `buildSlidePrompt`（第 89-103 行）中：
(a) 規則列（第 98 行）改為：
```js
    "規則：重點簡潔、適合長官閱讀。必須使用台灣繁體中文，嚴禁出現任何簡體中文字形（例如：写→寫、车→車、机→機、对→對、来→來）。每項效益需包含一個百分比數字（如「減少停機 50%」），代表該面向的達成度（0-100），AI 自行判斷填入。輸出前請逐字檢查。",
```
(b) JSON 範例（第 101 行）改為：
```js
    '{ "slideTitle":"簡報標題（15 字內）", "keyPoints":["3 個重點，各 15 字內"], "benefits":["減少停機 50%","節省維修成本 30%","提升產能效率 20%"], "conclusion":"結語一句（20 字內）" }'
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/prompts.js`
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add v4/js/prompts.js
git commit -m "feat(v4): 簡報效益規則含達成度百分比"
```

---

### Task 2: 簡報 render 加入長條圖

**Files:**
- Modify: `v4/js/templates/slide/index.js`（render）
- Modify: `v4/css/base.css`（簡報圖表樣式）

**Interfaces:**
- Consumes: `s.benefits`（含百分比文字）。
- Produces: `.slide-chart`（SVG 長條圖 + `.sc-labels` 標籤）。

- [ ] **Step 1: 修改 slide render**

Modify `v4/js/templates/slide/index.js`：在 `render` 內、`const benefits = Array.isArray(s.benefits)?s.benefits:[];`（第 11 行）之後加入 `gaBarChart` 輔助函式（放在 render 外、export default 前）：

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
      '<text x="'+(i*barW+barW/2+2)+'" y="142" text-anchor="middle" fill="#E2E8F0" font-size="11">'+esc(vals[i])+'%</text></g>';
  }).join("");
  const labels = benefits.map((b,i)=>'<div class="sc-label" style="--sc:'+colors[i%3]+'">'+esc(b)+"</div>").join("");
  return '<div class="slide-chart">'+
    '<div class="sc-cap">效益達成度</div>'+
    '<svg viewBox="0 0 280 150" class="sc-svg">'+bars+"</svg>"+
    '<div class="sc-labels">'+labels+"</div>"+
  "</div>";
}
```

再將 render 回傳字串中的效益區（第 25 行）：
```js
        '<div class="slide-benefits">'+(benefits.length?benefits.map(b=>'<div class="sb-item">'+esc(b)+"</div>").join(""):"")+"</div>"+
```
改為：
```js
        (benefits.length?'<div class="slide-benefits">'+gaBarChart(benefits)+"</div>":"")+
```

- [ ] **Step 2: base.css 加入圖表樣式**

Modify `v4/css/base.css`：在簡報區段（`.slide-page .slide-photo-tag` 之後）加入：
```css
.slide-page .slide-chart{border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.06);padding:10px 12px}
.slide-page .sc-cap{font-size:11px;letter-spacing:.16em;color:#93C5FD;font-weight:600;margin-bottom:4px}
.slide-page .sc-svg{width:100%;height:auto;display:block}
.slide-page .sc-labels{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px}
.slide-page .sc-label{font-size:12px;color:#E2E8F0;display:inline-flex;align-items:center;gap:6px}
.slide-page .sc-label::before{content:"";width:10px;height:10px;border-radius:2px;background:var(--sc);flex-shrink:0}
```

- [ ] **Step 3: 驗證語法與樣式**

Run: `node --check v4/js/templates/slide/index.js`
Expected: exit 0。
重新讀取 `v4/css/base.css` 簡報區段：新規則括號平衡。

- [ ] **Step 4: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器）：
1. 生成一頁簡報（有 API key）→ 效益區顯示長條圖（3 根黃/橙/紅長條），高度對應效益文字百分比。
2. 效益文字作為標籤（含色點）顯示在圖表下方。
3. 手動把 `data.slide.benefits` 改為無百分比的文字 → 三根等高（均分）。
4. 照片正常顯示、版面不重疊。
5. 列印/PDF 含長條圖。

- [ ] **Step 5: Commit**

```bash
git add v4/js/templates/slide/index.js v4/css/base.css
git commit -m "feat(v4): 一頁簡報長條圖結合效益說明"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件三節（AI prompt→Task 1、render→Task 2、CSS→Task 2），驗收標準 1-5 對應 Task 2 Step 4 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`gaBarChart(benefits)` 在 Step 1 定義與呼叫一致；`vals`/`colors`/`barW` 內部一致；`.slide-chart/.sc-cap/.sc-svg/.sc-labels/.sc-label` 在 Step 1（render）與 Step 2（CSS）一致。
