# V4 一頁簡報圖表類型 AI 決定（chartType + 圓餅圖）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 於 JSON 回傳 `chartType`（`"bar"|"pie"`），render 依其分派長條圖或圓餅圖；長條圖改細長型。

**Architecture:** `prompts.js` 規則/JSON 範例加 `chartType`；`slide/index.js` 加 `gaChart` 分派 + `gaPieChart`，長條圖細長化；CSS 不新增（共用 `.slide-chart/.sc-*`）。

**Tech Stack:** 純 ES Modules；`v4/js/prompts.js`、`v4/js/templates/slide/index.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「Node 直調 render 驗證輸出字串」+「本機伺服器手動操作瀏覽器」。
- 數值抽取：`/(\d+(?:\.\d+)?)\s*%/`；抽不到該條回退 `Math.round(100/benefits.length)`；抽到 `Math.max(0, Math.min(100, parseFloat(m[1])))`。
- 長條圖 `barW = Math.min(34, Math.max(10, 260/benefits.length))`，bar 寬 `barW-6`，高 `Math.max(4, Math.round(vals[i]/100*120))`，色 `["#F2B705","#E8590C","#D63426"]`。
- 圓餅圖：色盤 `["#F2B705","#E8590C","#D63426","#3B82F6","#22C55E","#A855F7"]`，`viewBox="0 0 280 150"`，圓心 (140,75)、半徑 55；比例=單項/總和；扇形 `path` 弧；`<text>` 於 0.35r 處顯示 `值%`。
- 分派：`chartType==="pie"` → 圓餅；其餘（含缺省）→ 長條（回溯相容）。
- 標籤 `.sc-labels` 長條/圓餅共用；色點 `--sc`。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: prompt 加 chartType

**Files:**
- Modify: `v4/js/prompts.js`（buildSlidePrompt）

- [ ] **Step 1: 調整規則與 JSON 範例**

Modify `v4/js/prompts.js`：
(a) 規則列（含「每項效益需包含一個百分比數字」那句）之後補充：
```js
    "回傳 chartType 欄位：若各效益為各自達成度的比較，用 \"bar\"（長條圖）；若各效益為整體成效的組成比例（數值加總接近 100%），用 \"pie\"（圓餅圖）。AI 自行判斷。",
```
(b) JSON 範例加入 `chartType`：
```js
    '{ "slideTitle":"簡報標題（15 字內）", "keyPoints":["3 個重點，各 15 字內"], "benefits":["減少停機 50%","節省維修成本 30%","提升產能效率 20%"], "chartType":"bar", "conclusion":"結語一句（20 字內）" }'
```

- [ ] **Step 2: 驗證語法** Run: `node --check v4/js/prompts.js`（exit 0）

- [ ] **Step 3: Commit** `git commit -m "feat(v4): 簡報 prompt 加入 chartType 圖表類型欄位"`

---

### Task 2: render 分派 chartType + 圓餅圖

**Files:**
- Modify: `v4/js/templates/slide/index.js`

- [ ] **Step 1: 長條圖細長化 + 加 gaPieChart + gaChart 分派**

Modify `v4/js/templates/slide/index.js`：
(a) `gaBarChart` 內 `const barW = Math.max(8, 260/benefits.length);` 改為：
```js
  const barW = Math.min(34, Math.max(10, 260/benefits.length));
```
(b) `gaBarChart` 函式後新增：
```js
function gaPieChart(benefits){
  const colors=["#F2B705","#E8590C","#D63426","#3B82F6","#22C55E","#A855F7"];
  const vals = benefits.map(b=>{
    const m = /(\d+(?:\.\d+)?)\s*%/.exec(String(b));
    return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : Math.round(100/benefits.length);
  });
  const total = vals.reduce((a,v)=>a+v,0) || 1;
  const cx=140, cy=75, r=55;
  const segs = [];
  let a = -Math.PI/2;
  vals.forEach((v,i)=>{
    const frac = v/total;
    const a1 = a + frac*Math.PI*2;
    const x0 = cx + r*Math.cos(a), y0 = cy + r*Math.sin(a);
    const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const big = frac>0.5?1:0;
    const mx = cx + r*0.35*Math.cos((a+a1)/2), my = cy + r*0.35*Math.sin((a+a1)/2);
    const pct = Math.round(v);
    segs.push(
      '<path d="M'+cx+','+cy+' L'+x0.toFixed(2)+','+y0.toFixed(2)+' A'+r+','+r+' 0 '+big+' 1 '+x1.toFixed(2)+','+y1.toFixed(2)+' Z" fill="'+colors[i%colors.length]+'" stroke="#0B1220" stroke-width="1"></path>'+
      '<text x="'+mx.toFixed(2)+'" y="'+(my+4).toFixed(2)+'" text-anchor="middle" fill="#0B1220" font-size="10" font-weight="600">'+pct+'%</text>'
    );
    a = a1;
  });
  const labels = benefits.map((b,i)=>'<div class="sc-label" style="--sc:'+colors[i%colors.length]+'">'+esc(b)+"</div>").join("");
  return '<div class="slide-chart">'+
    '<div class="sc-cap">效益達成度</div>'+
    '<svg viewBox="0 0 280 150" class="sc-svg">'+segs.join("")+"</svg>"+
    '<div class="sc-labels">'+labels+"</div>"+
  "</div>";
}

function gaChart(benefits, chartType){
  return chartType==="pie" ? gaPieChart(benefits) : gaBarChart(benefits);
}
```
(c) `render` 內，`const benefits = ...;` 之後加：
```js
    const chartType = s.chartType==="pie" ? "pie" : "bar";
```
(d) render 效益區呼叫改為：
```js
        (benefits.length?'<div class="slide-benefits">'+gaChart(benefits, chartType)+"</div>":"")+
```

- [ ] **Step 2: 驗證語法** Run: `node --check v4/js/templates/slide/index.js`（exit 0）

- [ ] **Step 3: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-charttype.mjs，import ../../v4/js/templates/slide/index.js
// 1) chartType:"pie" → 含 slide-chart 且含 <path 且不含 <rect
// 2) chartType:"bar" → 含 <rect 不含 <path
// 3) 缺省 chartType → 含 <rect（回溯相容）
// 4) 各 path 扇形數 = benefits 長度；pie 值 50/30/20 → text 含 50%、30%、20%
```
執行並確認全部 true 後刪除暫存檔。

- [ ] **Step 4: Commit** `git commit -m "feat(v4): 簡報圖表依 chartType 分派長條/圓餅圖"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 第四節（chartType 規則→Task 1、render 分派/圓餅→Task 2、細長長條→Task 2、驗收 1-6→Task 2 Step 3/Step 4）。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`gaChart(benefits, chartType)` 定義/呼叫一致；`gaPieChart` 內 `vals/total/cx/cy/r` 一致；`colors` 於 `gaBarChart`(3 色)與 `gaPieChart`(6 色)各自獨立定義，無跨函式衝突；`.sc-*` 類名與既有 CSS 一致。
