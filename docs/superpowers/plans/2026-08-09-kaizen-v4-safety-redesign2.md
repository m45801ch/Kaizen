# V4 工安模板危險等級＋預期效益重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 工安模板危險等級改為 AI 判定＋點選色塊切換（移除文字輸入框）；預期效益改為工安風（黃黑警示條＋三色圖示）。

**Architecture:** `prompts.js` 的 `buildPrompt` 加入 `safetyLevel`；`document.js` 的 `fillForm` 寫入 safetyLevel、`syncFromDom` 移除已刪欄位讀取、`bindDocument` 加 `[data-level-set]` 點選；`safety/index.js` 重寫危險等級欄與預期效益區（`gaBenefitBox`）；`safety.css` 加新樣式、移除舊 `.ga-level-input`。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/prompts.js`、`v4/js/document.js`、`v4/js/templates/safety/index.js`、`v4/css/safety.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。
- 危險等級值限「高/中/低」；AI 回傳的 `safetyLevel` 若不在三者內則忽略。
- 色塊點選寫入 `data.extra.safetyLevel` 並 `renderDocument()`+`saveForm()`；`[data-level-set]` 值為「高/中/低」。
- `f-benefit-1/2/3` id 保留（`syncFromDom`/`fillForm` 持續讀寫效益）。
- `f-safety-level` 欄位移除；`syncFromDom` 不再讀取它。
- 其他模板、AI 其他欄位、列印機制不變。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: AI 判定危險等級（prompts + document 資料流）

**Files:**
- Modify: `v4/js/prompts.js`（buildPrompt 加 safetyLevel）
- Modify: `v4/js/document.js`（fillForm 寫入、syncFromDom 移除）

**Interfaces:**
- Produces: AI 回傳 `safetyLevel`（高/中/低）；`data.extra.safetyLevel` 由 AI 自動填入。

- [ ] **Step 1: buildPrompt 加入 safetyLevel**

Modify `v4/js/prompts.js`：將 `buildPrompt` 的 JSON 欄位區塊（第 25-32 行，含 `"benefit3": "…"` 那行與 `}`）中的
```js
    '  "benefit3": "第三項預期效益，只寫一行、12 字內"',
    "}",
```
改為：
```js
    '  "benefit3": "第三項預期效益，只寫一行、12 字內"',
    '  "safetyLevel": "依改善前的風險程度判定：高／中／低，只回傳其中一個字"',
    "}",
```
並在「注意事項」區塊（第 39 行「5. 三項預期效益…」之後）加入：
```js
    "5b. 請同時判定改善前的風險等級（safetyLevel），只回傳「高」「中」「低」其中一個字；若無法判定則回傳「中」。",
```
（因原注意事項有編號 1-8，為避免改號，使用「5b」插入，不影響其他編號。）

- [ ] **Step 2: fillForm 寫入 safetyLevel**

Modify `v4/js/document.js`：在 `fillForm`（第 43-55 行）的 `renderAllAnalysis();` 之前加入：
```js
  if(getTemplate(state.template).id==="safety"){
    const lv=String(obj.safetyLevel||"");
    if(lv==="高"||lv==="中"||lv==="低"){ data.extra = data.extra||{}; data.extra.safetyLevel=lv; }
  }
```
（`getTemplate` 已在文件頂部 import。）

- [ ] **Step 3: syncFromDom 移除 f-safety-level 讀取**

Modify `v4/js/document.js`：將第 24 行
```js
  if(tpl.id==="safety") data.extra.safetyLevel = $("f-safety-level")?$("f-safety-level").value:"";
```
改為：
```js
  if(tpl.id==="safety"){ data.extra = data.extra||{}; if(!data.extra.safetyLevel) data.extra.safetyLevel=""; }
```
（不再從已移除的輸入框讀值，保留既有 safetyLevel。）

- [ ] **Step 4: 驗證語法**

Run: `node --check v4/js/prompts.js`、`node --check v4/js/document.js`
Expected: 兩者 exit 0。

- [ ] **Step 5: Commit**

```bash
git add v4/js/prompts.js v4/js/document.js
git commit -m "feat(v4): AI 判定危險等級並自動填入"
```

---

### Task 2: 工安模板危險等級色塊＋預期效益工安風

**Files:**
- Modify: `v4/js/templates/safety/index.js`（render 重寫）
- Modify: `v4/css/safety.css`（新樣式、移除舊 input 樣式）

**Interfaces:**
- Consumes: `data.extra.safetyLevel`（Task 1）、`d.benefits[0..2]`。
- Produces: 三個 `[data-level-set]` 色塊按鈕；`gaBenefitBox`（黃黑警示條＋三色圖示）；`#f-benefit-1/2/3` textarea。

- [ ] **Step 1: 重寫 safety 模板 render**

Modify `v4/js/templates/safety/index.js`：將整個檔案替換為：
```js
/* 工安模板：警示黃×黑、危險等級色塊、工安風預期效益 */
import { esc, docHeader, titleField, photoZone, analysisArea } from "../shared.js";

function gaBenefitBox(d){
  const items=[
    ['fa-yellow', d.benefits[0]],
    ['fa-orange', d.benefits[1]],
    ['fa-red',    d.benefits[2]]
  ];
  const icons={
    'fa-yellow':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l10 18H2z"/><path d="M12 10v4m0 3h.01"/></svg>',
    'fa-orange':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M12 8v5m0 3h.01"/></svg>',
    'fa-red':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7 7 .6-5.4 4.8 1.7 7L12 18.3 5.7 21.4l1.7-7L2 9.6 9 9z"/></svg>'
  };
  return '<div class="ga-benefit-box">'+
    '<div class="ga-benefit-cap">預期效益</div>'+
    '<div class="ga-benefit-cols">'+items.map((it,idx)=>{
      const cls=it[0], val=it[1];
      return '<div class="ga-benefit-col '+cls+'"><div class="ga-benefit-icon">'+icons[cls]+"</div>"+
        '<textarea class="editable" id="f-benefit-'+(idx+1)+'" rows="1" placeholder="…">'+esc(val)+"</textarea>"+
      "</div>";
    }).join("")+"</div>"+
    '<div class="ga-stripe"></div>'+
  "</div>";
}

export default {
  id:"safety",
  name:"工安",
  desc:"工安專用：警示黃×黑主題、危險等級色塊、工安風預期效益。",
  render(d, h){
    const level = (d.extra && d.extra.safetyLevel) || "";
    const levels = ["高","中","低"];
    const levelRow = '<div class="ga-level-row">'+
      '<span class="ga-level-label">危險等級</span>'+
      levels.map(l=>
        '<button type="button" class="ga-level-chip'+(level===l?" active":"")+'" data-level-set="'+l+'" title="設定危險等級 '+l+'">'+l+"</button>"
      ).join("")+
    "</div>";
    return docHeader(d)+'<div class="ga-stripe"></div>'+titleField(d)+levelRow+
      '<div class="kaizen-pair ga">'+
        '<div class="kaizen-box ga before"><div class="box-cap"><span class="box-no">1</span>改善前（現況說明）</div>'+
          photoZone("before", d.photos)+analysisArea("before", d.before, d.after, h.buildLines)+
        "</div>"+
        '<div class="kaizen-box ga after"><div class="box-cap"><span class="box-no">2</span>改善後（改善對策）</div>'+
          photoZone("after", d.photos)+analysisArea("after", d.before, d.after, h.buildLines)+
        "</div>"+
      "</div>"+
      gaBenefitBox(d);
  }
};
```
注意：`benefitBox` 不再 import；改用自訂 `gaBenefitBox`。

- [ ] **Step 2: 更新 safety.css 危險等級樣式**

Modify `v4/css/safety.css`：將目前的 `.ga-level-chip` 與 `.ga-level-input` 區塊（含 `.ga-level-chip[data-level=…]`）替換為：
```css
body.tpl-safety .ga-level-row{
  display:flex;align-items:center;gap:8px;margin:10px 0 16px;flex-wrap:wrap;
}
body.tpl-safety .ga-level-label{
  font-size:13px;font-weight:900;letter-spacing:.05em;color:#141414;
  background:#F2B705;padding:6px 12px;border:2px solid #141414;height:38px;display:flex;align-items:center;
}
body.tpl-safety .ga-level-chip{
  width:52px;height:38px;border:2px solid #141414;border-radius:4px;
  font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;
  background:#E4DFD3;color:#141414;transition:all .15s;
}
body.tpl-safety .ga-level-chip:hover{background:#F2B705;color:#141414}
body.tpl-safety .ga-level-chip.active{background:#D63426;color:#fff;box-shadow:inset 0 0 0 3px #141414}
body.tpl-safety .ga-level-chip.active[data-level-set="中"]{background:#F2B705;color:#141414}
body.tpl-safety .ga-level-chip.active[data-level-set="低"]{background:#1F8A3C}
```

- [ ] **Step 3: 新增預期效益工安樣式**

Modify `v4/css/safety.css`：在 `.ga-level-input` 移除後、`/* 列印 */` 之前加入：
```css
body.tpl-safety .ga-benefit-box{border:3px solid #141414;border-radius:4px;overflow:hidden;background:#fff;margin-top:20px}
body.tpl-safety .ga-benefit-cap{
  background:#F2B705;color:#141414;font-weight:900;letter-spacing:.06em;
  padding:11px 16px;border-bottom:3px solid #141414;
}
body.tpl-safety .ga-benefit-cols{display:grid;grid-template-columns:repeat(3,1fr)}
body.tpl-safety .ga-benefit-col{
  border-right:1px solid #141414;padding:12px 14px;display:flex;align-items:center;gap:10px;
  border-top:6px solid #F2B705;
}
body.tpl-safety .ga-benefit-col:last-child{border-right:none}
body.tpl-safety .ga-benefit-col.fa-orange{border-top-color:#E8590C}
body.tpl-safety .ga-benefit-col.fa-red{border-top-color:#D63426}
body.tpl-safety .ga-benefit-icon{flex-shrink:0;color:#141414}
body.tpl-safety .ga-benefit-icon svg{width:24px;height:24px;display:block}
body.tpl-safety .ga-benefit-col.fa-yellow .ga-benefit-icon{color:#D97706}
body.tpl-safety .ga-benefit-col.fa-orange .ga-benefit-icon{color:#E8590C}
body.tpl-safety .ga-benefit-col.fa-red .ga-benefit-icon{color:#D63426}
body.tpl-safety .ga-benefit-col .editable{flex:1;min-width:0;font-size:13px;line-height:1.7;background:#fff;color:#141414}
```
並確認 `.ga-stripe` 樣式已存在（標題分隔帶與效益底部共用）。

- [ ] **Step 4: document.js 加 [data-level-set] 點選**

Modify `v4/js/document.js`：在 `bindDocument` 的 click 委派中、`[data-center]` 分支之後、`[data-reset-ratio]` 分支之前插入：
```js
    const lv=e.target.closest("[data-level-set]");
    if(lv){
      ["before","after"].forEach(()=>{});
      data.extra = data.extra||{};
      data.extra.safetyLevel=lv.dataset.levelSet;
      renderDocument();
      saveForm();
      return;
    }
```
（`renderDocument` 會重渲 safety 模板並高亮選中的色塊；`saveForm` 已 import。）

- [ ] **Step 5: 驗證語法與樣式**

Run: `node --check v4/js/templates/safety/index.js`、`node --check v4/js/document.js`
Expected: 兩者 exit 0。
重新讀取 `v4/css/safety.css`：新樣式括號平衡、無殘留 `.ga-level-input`。

- [ ] **Step 6: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器），切到「工安」模板：
1. 危險等級欄顯示三個統一高度色塊（高/中/低），無文字輸入框。
2. 點「高」→ 紅底高亮；點「中」→ 黃黑；點「低」→ 綠；刷新保留。
3. 按「自動填寫＋正式措辭」（有 API key）→ 若 AI 回傳 safetyLevel，對應色塊自動高亮。
4. 預期效益區：黃色標題帶、三欄各有黃/橙/紅警示色條與圖示、底部黃黑斜紋。
5. 效益欄可輸入；切其他模板不影響。
6. 列印/PDF 輸出正常（無文字輸入框、含工安配色）。

- [ ] **Step 7: Commit**

```bash
git add v4/js/templates/safety/index.js v4/css/safety.css v4/js/document.js
git commit -m "feat(v4): 工安模板危險等級色塊切換與工安風預期效益"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件三節（AI 判定→Task 1、危險等級欄→Task 2、預期效益→Task 2），驗收標準 1-5 對應 Task 1 Step 5 / Task 2 Step 6 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`data.extra.safetyLevel` 在 Task 1（AI 寫入）、Task 2（點選寫入＋render 讀取）一致；`[data-level-set]`/`.ga-level-chip` 在 Task 2（render）與 document.js（點選）一致；`f-benefit-1/2/3` id 在 gaBenefitBox 與既有 syncFromDom/fillForm 一致。
