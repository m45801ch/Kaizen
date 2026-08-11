# V4 效益欄位強調詞變色（contenteditable）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通用/工安/品質三模板的「預期效益」欄位（`f-benefit-1/2/3`）從 `<textarea>` 改為 contenteditable div，`**關鍵詞**` 顯示紅色粗體、仍可直接編輯、編輯後 `**` 標記保留。

**Architecture:** `analysis.js` 的 `escEmphasis` 改 export 並新增反向函式 `unEmphasis`（`<b class="kw">x</b>`→`**x**`）；`shared.js` `benefitBox` 與 `safety/index.js` `gaBenefitBox` 效益欄位改 contenteditable div；`document.js` `syncFromDom`/`fillForm`/`bindDocument` 對效益 div 用 innerHTML + `unEmphasis`/`escEmphasis` 處理；`main.js` reset 改 innerHTML；CSS 加 `.benefit-edit .kw`。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/analysis.js`、`v4/js/templates/shared.js`、`v4/js/templates/safety/index.js`、`v4/js/document.js`、`v4/js/main.js`、`v4/css/base.css`。

## Global Constraints

- 效益資料模型不變：`data.benefits[i]` 為含 `**` 標記的純文字（如「提升設備**維修效率**」）。
- 渲染方向 `**x**` → `<b class="kw">x</b>`；儲存方向 `<b class="kw">x</b>` → `**x**`（`unEmphasis`）。
- 效益欄位保留 `id="f-benefit-N"`（既有 `syncFromDom`/`fillForm`/`bindDocument`/reset 相依）。
- 新增 `data-benefit="f-benefit-N"` 屬性標記 div（供 handler 判斷）。
- 「預期效益」標題不變色；簡報（slide）模板不在此範圍。
- 其他欄位（title/before/after）維持原控件，`autoResize` 已檢查 `tagName!=="TEXTAREA"` return（div 自動跳過，安全）。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: analysis.js 匯出強調函式 + 新增反向函式

**Files:**
- Modify: `v4/js/analysis.js`

**Interfaces:**
- Produces: `export function escEmphasis(s)`、`export function unEmphasis(html)`。

- [ ] **Step 1: 修改 analysis.js**

Modify `v4/js/analysis.js` 第 26-28 行：`escEmphasis` 加 `export`，並新增 `unEmphasis`：

```js
export function escEmphasis(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.+?)\*\*/g,'<b class="kw">$1</b>');
}
export function unEmphasis(html){
  return String(html).replace(/<b class="kw">([\s\S]*?)<\/b>/g,"**$1**");
}
function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
```

- [ ] **Step 2: 驗證語法** Run: `node --check v4/js/analysis.js`（exit 0）

- [ ] **Step 3: Node 驗證**

```js
// 暫存檔 .superpowers/sdd/test-esc.mjs
import { escEmphasis, unEmphasis } from "../../v4/js/analysis.js";
console.log("EMPH:", escEmphasis("提升設備**維修效率**") === '提升設備<b class="kw">維修效率</b>');
console.log("UNEMPH:", unEmphasis('提升設備<b class="kw">維修效率</b>') === "提升設備**維修效率**");
console.log("UNEMPH_PLAIN:", unEmphasis("沒有強調") === "沒有強調");
console.log("ESCAPE:", escEmphasis("A<b>") === "A&lt;b&gt;");
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 4: Commit** `git commit -m "feat(v4): 匯出強調/反向函式供效益欄位使用"`

---

### Task 2: 三模板效益欄位改 contenteditable div

**Files:**
- Modify: `v4/js/templates/shared.js`（`benefitBox`，generic+quality 共用）
- Modify: `v4/js/templates/safety/index.js`（`gaBenefitBox`）
- Modify: `v4/css/base.css`

**Interfaces:**
- Consumes: `escEmphasis`（Task 1）。
- Produces: 效益欄位改 `<div class="benefit-edit editable" contenteditable="true" data-benefit="f-benefit-N" id="f-benefit-N">`。

- [ ] **Step 1: shared.js 修改**

Modify `v4/js/templates/shared.js`：
(a) 第 1 行 import 改為：
```js
import { escEmphasis } from "../analysis.js";
```
（現第 1 行為 `export function esc(s){...}`，保留。）
(b) `benefitBox` 第 60 行 textarea 改為：
```js
      '<div class="benefit-edit editable" id="'+id+'" contenteditable="true" data-benefit="'+id+'" placeholder="…">'+escEmphasis(v)+"</div>"+
```
（`v` 為 `d.benefits[i]||""`，由 `escEmphasis` 處理 `**` 並轉義。）

- [ ] **Step 2: safety/index.js 修改**

Modify `v4/js/templates/safety/index.js`：
(a) 第 2 行 import 改為：
```js
import { esc, docHeader, titleField, photoZone, analysisArea } from "../shared.js";
import { escEmphasis } from "../analysis.js";
```
(b) `gaBenefitBox` 第 20 行 textarea 改為：
```js
        '<div class="benefit-edit editable" id="f-benefit-'+(idx+1)+'" contenteditable="true" data-benefit="f-benefit-'+(idx+1)+'" placeholder="…">'+escEmphasis(val)+"</div>"+
```

- [ ] **Step 3: base.css 加樣式**

Modify `v4/css/base.css`（檔案末尾）：
```css
.benefit-edit{white-space:pre-wrap}
.benefit-edit .kw{color:var(--danger);font-weight:700}
```

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/templates/shared.js && node --check v4/js/templates/safety/index.js`（皆 exit 0）

- [ ] **Step 5: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-benefit-render.mjs
import generic from "../../v4/js/templates/generic/index.js";
import safety from "../../v4/js/templates/safety/index.js";
const d={ title:"t", before:"", after:"", benefits:["提升設備**維修效率**","",""], photos:{before:[],after:[]}, extra:{} };
const g = generic.render(d, { esc:(s)=>String(s==null?"":s), buildLines:(t)=>"", docTitle:"", docHeader:(x)=>"", titleField:(x)=>"", photoZone:(x)=>"", analysisArea:(x)=>"", benefitBox:(x)=>"benefitbox" });
// 直接測 shared benefitBox 與 safety gaBenefitBox（內部函式需經 render 或直接 import）
import { benefitBox } from "../../v4/js/templates/shared.js";
const bb = benefitBox(d);
console.log("BB_DIV:", bb.includes('<div class="benefit-edit editable" id="f-benefit-1"'));
console.log("BB_KW:", bb.includes('<b class="kw">維修效率</b>'));
console.log("BB_ESCAPE:", !bb.includes("**維修效率**"));
const s = safety.render(d, { esc:(x)=>String(x==null?"":x), docTitle:"", buildLines:(t)=>"", docHeader:(x)=>"", titleField:(x)=>"", photoZone:(x)=>"", analysisArea:(x)=>"", benefitBox:(x)=>"bb", docHeader2:"" });
console.log("SAFETY_KW:", s.includes('<b class="kw">維修效率</b>'));
```
執行確認全部 `true` 後刪除暫存檔。（若 render 的 helpers 簽名不合，直接測 `benefitBox`/`gaBenefitBox` 輸出字串即可；`gaBenefitBox` 未匯出時，可暫時以 regex 檢查 render 輸出或改用讀檔驗證。）

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 三模板效益欄位改 contenteditable 支援強調變色"`

---

### Task 3: document.js 與 main.js 同步處理

**Files:**
- Modify: `v4/js/document.js`（`syncFromDom`/`fillForm`/`bindDocument`）
- Modify: `v4/js/main.js`（reset）

**Interfaces:**
- Consumes: `escEmphasis`、`unEmphasis`（Task 1）、`data-benefit` div（Task 2）。
- Produces: 效益 div 的 input/編輯正確同步 `data.benefits[i]`（含 `**`）。

- [ ] **Step 1: 修改 document.js import**

Modify `v4/js/document.js` 第 4 行：
```js
import { buildLines, escEmphasis, unEmphasis } from "./analysis.js";
```

- [ ] **Step 2: syncFromDom 效益讀取改 innerHTML**

Modify `v4/js/document.js` 第 20-22 行：
```js
  data.benefits[0] = $("f-benefit-1") ? unEmphasis($("f-benefit-1").innerHTML) : "";
  data.benefits[1] = $("f-benefit-2") ? unEmphasis($("f-benefit-2").innerHTML) : "";
  data.benefits[2] = $("f-benefit-3") ? unEmphasis($("f-benefit-3").innerHTML) : "";
```

- [ ] **Step 3: fillForm 對效益 div 設 innerHTML**

Modify `v4/js/document.js` 第 44-53 行 `fillForm`：在 `Object.keys(map).forEach` 迴圈內，`el.value=v` 處改為依元素類型分支。現第 50 行：
```js
    if(force || state.override || !el.value.trim()) el.value=v;
```
改為：
```js
    if(force || state.override || !(el.value||el.textContent||"").trim()){
      if(el.dataset && el.dataset.benefit) el.innerHTML = escEmphasis(v);
      else el.value = v;
    }
```
（`fillForm` 的 `map` 含 benefit1-3 → `f-benefit-*`，div 有 `data-benefit` → 走 innerHTML。）

- [ ] **Step 4: bindDocument 效益 div input 處理**

Modify `v4/js/document.js`：現第 160-170 行 FORM input 綁定對 `f-benefit-*` 也走 `syncFromDom`（會讀 innerHTML+unEmphasis，已正確）。確認該迴圈不需改動；但 `autoResize($(id))` 對 div 無效（`autoResize` 檢查 `tagName!=="TEXTAREA"` return）— 確認不報錯即可，不需改。
另外確認：效益 div 編輯後，`syncFromDom()` 讀 `innerHTML`（含 `<b>`）→ `unEmphasis` → 存 `**`。input 事件綁定已涵蓋（FORM 清單含 `f-benefit-1/2/3`）。

- [ ] **Step 5: main.js reset 改 innerHTML**

Modify `v4/js/main.js` 第 92 行：
```js
    $("f-benefit-1").innerHTML=""; $("f-benefit-2").innerHTML=""; $("f-benefit-3").innerHTML="";
```

- [ ] **Step 6: 驗證語法** Run: `node --check v4/js/document.js && node --check v4/js/main.js`（皆 exit 0）

- [ ] **Step 7: Node 驗證 syncFromDom/fillForm 邏輯**

```js
// 暫存檔 .superpowers/sdd/test-benefit-dom.mjs
// 需 dom-stub（document.getElementById/createElement/querySelector + localStorage + window.CustomEvent）
// 1) fillForm({benefit1:"提升設備**維修效率**"}, true) → $("f-benefit-1").innerHTML 含 <b class="kw">
// 2) syncFromDom 於 div.innerHTML='提升設備<b class="kw">維修效率</b>' 時 → data.benefits[0]==="提升設備**維修效率**"
// 3) reset 路徑：main.js resetBtn handler 對 benefit 改 innerHTML（可直接驗證 document.js 匯出函式，或標明瀏覽器手動驗證）
```
執行確認全 PASS 後刪除暫存檔。（DOM stub 複雜度高的話，改以「純函式驗證 `unEmphasis(escEmphasis(x))===x` 往返」替代並標明手動驗證。）

- [ ] **Step 8: Commit** `git commit -m "feat(v4): 效益欄位 innerHTML 同步與強調往返處理"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 三節 1（強調函式）→Task 1；2（shared+safety+CSS）→Task 2；3（document+main）→Task 3；CSS→Task 2。驗收 1-5 對應 Task 2 Step 5、Task 3 Step 7。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整；Task 2 Step 5 與 Task 3 Step 7 的 DOM 測試已標明可回退純函式驗證。
3. **型別一致性**：`escEmphasis`/`unEmphasis`（Task 1 定義，Task 2/3 使用）、`data-benefit="f-benefit-N"`（Task 2 產生，Task 3 `el.dataset.benefit` 判斷）、`f-benefit-N` id（三處一致）皆一致。
