# V4 一頁簡報版面文字直接編輯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 生成一頁簡報後，標題/3 重點/3 效益/結語可在版面直接編輯；效益百分比一改，長條圖/圓餅圖即時重畫；修改即時寫入 `data.slide` 並存 localStorage。

**Architecture:** slide 模板 render 為文字元素加 `contenteditable` 與 `data-slide-field`；`document.js` 的 `bindDocument` 在每次 `renderDocument()` 後直接綁定 `[data-slide-field]`（沿用 f-* 欄位模式）；效益欄位編輯時重繪 `#doc .slide-benefits .sc-svg`（不動標籤 DOM）。`slide/index.js` 匯出 `gaChartSvg` 供 `document.js` 重繪。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「Node 直調 render 驗證輸出」+「本機伺服器手動操作瀏覽器」。
- `data.slide` 結構不變：`{ slideTitle, keyPoints[], benefits[], conclusion, chartType }`。
- `contenteditable` 元素 render 時內容仍用 `esc()`（保留字面 `**` 強調標記）；編輯後讀 `textContent` 原樣存回。
- 效益欄位編輯時**只重繪** `#doc .slide-benefits` 內的 `.sc-svg`，**不重建** `.sc-labels`（避免游標跳走）。
- 效益百分比抽取：`/(\d+(?:\.\d+)?)\s*%/`；抽不到該條重繪時維持原值。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: slide 模板 contenteditable + 匯出圖表 SVG 函式

**Files:**
- Modify: `v4/js/templates/slide/index.js`

**Interfaces:**
- Consumes: `data.slide`（`slideTitle/keyPoints/benefits/conclusion/chartType`）。
- Produces: `export function gaChartSvg(benefits, chartType)` — 回傳圖表 SVG 字串（bar 或 pie，含 `.sc-cap` 外層結構）；render 內文字元素含 `contenteditable="true"` 與 `data-slide-field`。

- [ ] **Step 1: 重構圖表函式並匯出**

Modify `v4/js/templates/slide/index.js`：

(a) `gaBarChart`、`gaPieChart`、`gaChart` 改為接受並回傳完整 chart 區塊（保留現有 `slide-chart` 結構），並新增匯出 `gaChartSvg`：

現有（第 4-59 行）保持 `gaBarChart(benefits)` / `gaPieChart(benefits)` 內部演算法不變，但改寫為：

```js
function gaChartBlock(benefits, chartType){
  const svg = chartType==="pie" ? gaPieSvg(benefits) : gaBarSvg(benefits);
  const labels = benefits.map((b,i)=>{
    const colors = chartType==="pie" ? ["#F2B705","#E8590C","#D63426","#3B82F6","#22C55E","#A855F7"] : ["#F2B705","#E8590C","#D63426"];
    return '<div class="sc-label" contenteditable="true" data-slide-field="benefits-'+i+'" style="--sc:'+colors[i%colors.length]+'">'+esc(b)+"</div>";
  }).join("");
  return '<div class="slide-chart">'+
    '<div class="sc-cap">效益達成度</div>'+
    '<svg viewBox="0 0 280 150" class="sc-svg">'+svg+"</svg>"+
    '<div class="sc-labels">'+labels+"</div>"+
  "</div>";
}

function gaBarSvg(benefits){
  const colors=["#F2B705","#E8590C","#D63426"];
  const vals = benefits.map(b=>{
    const m = /(\d+(?:\.\d+)?)\s*%/.exec(String(b));
    return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : Math.round(100/benefits.length);
  });
  const barW = Math.min(34, Math.max(10, 260/benefits.length));
  return benefits.map((b,i)=>{
    const h = Math.max(4, Math.round(vals[i]/100*120));
    const y = 130 - h;
    return '<g><rect x="'+(i*barW+8)+'" y="'+y+'" width="'+(barW-6)+'" height="'+h+'" fill="'+colors[i%3]+'" rx="2"></rect>'+
      '<text x="'+(i*barW+barW/2+2)+'" y="142" text-anchor="middle" fill="#E2E8F0" font-size="11">'+esc(vals[i])+'%</text></g>';
  }).join("");
}

function gaPieSvg(benefits){
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
  return segs.join("");
}

export function gaChartSvg(benefits, chartType){
  return gaChartBlock(benefits, chartType==="pie" ? "pie" : "bar");
}
```

(b) render 內（第 65-88 行）改為：

```js
render(d){
    const s = d.slide || { slideTitle:"", keyPoints:[], benefits:[], conclusion:"" };
    const points = Array.isArray(s.keyPoints)?s.keyPoints:[];
    const benefits = Array.isArray(s.benefits)?s.benefits:[];
    const chartType = s.chartType==="pie" ? "pie" : "bar";
    const photosBefore = (d.photos&&d.photos.before)||[];
    const photosAfter = (d.photos&&d.photos.after)||[];
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+
        (photosBefore[0]?'<div class="slide-photo"><span class="slide-photo-tag">改善前</span><img src="'+esc(photosBefore[0].previewDataUrl||photosBefore[0].dataUrl)+'" alt="改善前"></div>':"")+
        (photosAfter[0]?'<div class="slide-photo"><span class="slide-photo-tag">改善後</span><img src="'+esc(photosAfter[0].previewDataUrl||photosAfter[0].dataUrl)+'" alt="改善後"></div>':"")+
      "</div>"
      : "";
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title" contenteditable="true" data-slide-field="slideTitle">'+esc(s.slideTitle||d.title||"改善提案")+'</div>'+
      '<div class="slide-body">'+
        '<ul class="slide-points">'+(points.length?points.map((k,i)=>"<li contenteditable=\"true\" data-slide-field=\"keyPoints-"+i+"\">"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+"</ul>"+
        (benefits.length?'<div class="slide-benefits">'+gaChartBlock(benefits, chartType)+"</div>":"")+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion" contenteditable="true" data-slide-field="conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
  }
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/templates/slide/index.js`
Expected: exit 0。

- [ ] **Step 3: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-slide-edit-render.mjs
import slide, { gaChartSvg } from "../../v4/js/templates/slide/index.js";
const h = slide.render({ slide:{ slideTitle:"標題", keyPoints:["A","B","C"], benefits:["減少停機 50%","節省成本 30%","提升效率 20%"], chartType:"bar", conclusion:"結語" } });
console.log("TITLE_EDITABLE:", h.includes('class="slide-title" contenteditable="true"'));
console.log("LI_EDITABLE:", h.includes('contenteditable="true" data-slide-field="keyPoints-0"'));
console.log("BENEFIT_FIELD:", h.includes('data-slide-field="benefits-0"'));
console.log("CONCLUSION_EDITABLE:", h.includes('class="slide-conclusion" contenteditable="true"'));
console.log("SVG_PRESENT:", h.includes('class="sc-svg"'));
console.log("SVG_FN:", gaChartSvg(["減少停機 60%","節省成本 30%","提升效率 10%"], "bar").includes("60%"));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 4: Commit**

```bash
git add v4/js/templates/slide/index.js
git commit -m "feat(v4): 簡報文字可編輯與匯出圖表 SVG 函式"
```

---

### Task 2: bindDocument 綁定編輯與圖表重繪

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `slide/index.js` 匯出的 `gaChartSvg(benefits, chartType)`、`state`/`data`/`saveForm`（store.js）。
- Produces: `#doc` 內 `[data-slide-field]` 元素於 input 時寫回 `data.slide` 並存檔；`benefits-*` 重繪 `.sc-svg`。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 第 155-200 行（`bindDocument` 開頭至 `doc.dataset.bound` 守衛處），確認插入點（表單輸入綁定之後、分析預覽綁定之前或之後皆可，但須在 bound 守衛之前）。

- [ ] **Step 2: 加綁定**

Modify `v4/js/document.js`：
(a) 頂部 import（第 2-4 行）加入 `gaChartSvg`：
```js
import { getTemplate } from "./templates/index.js";
import { gaChartSvg } from "./templates/slide/index.js";
```
(b) `bindDocument` 內、`doc.dataset.bound` 守衛（第 198 行）之前加入：

```js
  /* 簡報文字直接編輯 */
  if(getTemplate(state.template).id==="slide"){
    doc.querySelectorAll("[data-slide-field]").forEach(el=>{
      el.addEventListener("input",()=>{
        const f=el.dataset.slideField;
        const s=data.slide;
        if(!s) return;
        if(f==="slideTitle") s.slideTitle=el.textContent;
        else if(f==="conclusion") s.conclusion=el.textContent;
        else {
          const m=/^([a-z]+)-(\d+)$/.exec(f);
          if(m&&m[1]==="keyPoints"&&s.keyPoints[+m[2]]!==undefined) s.keyPoints[+m[2]]=el.textContent;
          if(m&&m[1]==="benefits"&&s.benefits[+m[2]]!==undefined){ s.benefits[+m[2]]=el.textContent; redrawSlideChart(); }
        }
        saveForm();
      });
    });
  }
```

(c) `bindDocument` 結尾、閉合 `}` 前加入 `redrawSlideChart` 函式（與 `layoutPhotos` 同層級、`bindDocument` 外部）：

```js
function redrawSlideChart(){
  const box=document.querySelector("#doc .slide-benefits");
  if(!box||!data.slide||!Array.isArray(data.slide.benefits)||!data.slide.benefits.length) return;
  const chartType=data.slide.chartType==="pie" ? "pie" : "bar";
  const svgEl=box.querySelector(".sc-svg");
  if(svgEl) svgEl.outerHTML='<svg viewBox="0 0 280 150" class="sc-svg">'+gaChartSvg(data.slide.benefits, chartType).replace(/^<svg[^>]*>|<\/svg>$/g,"")+"</svg>";
}
```
說明：`gaChartSvg` 回傳整個 `slide-chart` 區塊；`redrawSlideChart` 用正則抽出內部 SVG 內容置換 `.sc-svg`，不動 `.sc-labels`（正在編輯的標籤不受影響）。

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/document.js`
Expected: exit 0。

- [ ] **Step 4: Node 驗證重繪邏輯**

```js
// 暫存檔 .superpowers/sdd/test-slide-edit-dom.mjs
// 需 dom-stub（document.getElementById/createElement/querySelector/querySelectorAll + localStorage + window.CustomEvent）
// 設定 state.template="slide"，data.slide={slideTitle:"t",keyPoints:["A"],benefits:["減少停機 50%"],conclusion:"c"}
// doc.renderDocument() 後取得 [data-slide-field=benefits-0] 元素，設 textContent="減少停機 60%"，觸發 input
// 驗證 data.slide.benefits[0]=="減少停機 60%" 且 .sc-svg innerHTML 含 60%
```
驗證全 PASS 後刪除暫存檔。（此為 DOM 依賴測試，若 stub 複雜度高可改以瀏覽器手動驗證替代並於 commit 訊息註明。）

- [ ] **Step 5: Commit**

```bash
git add v4/js/document.js
git commit -m "feat(v4): 簡報文字編輯同步 data.slide 並即時重繪圖表"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 第二節 1（contenteditable+data-slide-field）→Task 1；2（綁定+同步）→Task 2；3（圖表重繪 gaChartSvg）→Task 1 匯出 + Task 2 redrawSlideChart；4（列印，既由 renderDocument 以 data 渲染）→無需程式碼。驗收 1-5 對應 Task 1 Step 3 與 Task 2 Step 4。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整；Task 2 Step 4 的 DOM 測試已標明可回退手動驗證。
3. **型別一致性**：`gaChartSvg(benefits, chartType)` 於 Task 1 定義/匯出、Task 2 使用一致；`data-slide-field` 值（slideTitle/keyPoints-i/benefits-i/conclusion）Task 1 產生、Task 2 解析一致（`^([a-z]+)-(\d+)$` 匹配 keyPoints-/benefits-）；`.sc-svg` 類名兩任務一致。
