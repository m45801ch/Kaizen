# V4 整合自動填寫＋正式措辭與一頁簡報生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按「點我·自動填寫＋正式措辭」一次完成正式表格內容＋正式措辭＋一頁簡報（data.slide）；不切模板；移除獨立簡報按鈕；四模板共用 data。

**Architecture:** `tab-narrative.js` 的 `generateAll` 改為三個並行 AI 呼叫（buildPrompt/buildColloquialPrompt/buildSlidePrompt），生成 `data.slide` 但不切模板；移除 `slideBtn` 按鈕與 `generateSlide` 函式；`index.html` 移除按鈕。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/tab-narrative.js`、`v4/index.html`。

## Global Constraints

- `generateAll` 平行呼叫三 prompt：`buildPrompt(d)`、`buildColloquialPrompt(srcBefore,srcAfter)`、`buildSlidePrompt(d)`；`d={ title:data.title, before:srcBefore, after:srcAfter, benefits:["","",""] }`。
- `data.slide={ slideTitle, keyPoints[], benefits[], conclusion }`（沿用 generateSlide 建構方式），生成後 `saveForm()`。
- **不切模板、不切橫向**：`state.template`/`localStorage(STORE.template)`/`window.__applyOrientation` 均不動。
- 移除 `slideBtn`（index.html:50）與 `initNarrative` 中 `$("slideBtn").addEventListener("click",generateSlide)`（tab-narrative.js:111）；移除 `generateSlide` 函式（78-106 行）。
- 四模板共用 data：通用/工安/品質用 title/before/after/benefits；簡報用 data.slide。無需改 render。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: generateAll 整合簡報生成

**Files:**
- Modify: `v4/js/tab-narrative.js`（`generateAll`）

**Interfaces:**
- Consumes: `buildPrompt`/`buildColloquialPrompt`/`buildSlidePrompt`（prompts.js）、`sources()`、`fillForm`、`state`/`data`/`saveForm`。
- Produces: `data.slide` 生成並保存；畫面停目前模板。

- [ ] **Step 1: 修改 generateAll 為三並行呼叫**

Modify `v4/js/tab-narrative.js` `generateAll`（第 18-48 行）：`Promise.all` 改為三個呼叫（現第 30-33 行）：
```js
    const results=await Promise.all([
      callForProvider(state.provider,key,model,buildPrompt(d)),
      callForProvider(state.provider,key,model,buildColloquialPrompt(srcBefore,srcAfter)),
      callForProvider(state.provider,key,model,buildSlidePrompt(d))
    ]);
```

- [ ] **Step 2: 生成 data.slide**

Modify `generateAll`：在 `CONV_IDS.forEach(id=>autoResize($(id)));`（現第 37 行）之後加：
```js
    const slideObj=results[2];
    data.slide={ slideTitle:slideObj.slideTitle||d.title||"改善提案", keyPoints:Array.isArray(slideObj.keyPoints)?slideObj.keyPoints:[], benefits:Array.isArray(slideObj.benefits)?slideObj.benefits:[], conclusion:slideObj.conclusion||"" };
    saveForm();
```
（不切模板、不切橫向。）

- [ ] **Step 3: 更新狀態訊息**

Modify `generateAll` 第 40 行：
```js
    status("success","已同步完成正式表格、正式措辭與一頁簡報。");
```

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/tab-narrative.js`（exit 0）

- [ ] **Step 5: Node 驗證 data.slide 建構**

```js
// 暫存檔 .superpowers/sdd/test-merge-slide.mjs
// 驗證 data.slide 建構邏輯：slideObj 欄位映射正確
function buildSlide(slideObj, d){
  return { slideTitle:slideObj.slideTitle||d.title||"改善提案", keyPoints:Array.isArray(slideObj.keyPoints)?slideObj.keyPoints:[], benefits:Array.isArray(slideObj.benefits)?slideObj.benefits:[], conclusion:slideObj.conclusion||"" };
}
const s=buildSlide({ slideTitle:"新標題", keyPoints:["a","b","c"], benefits:["x","y"], conclusion:"結" }, { title:"舊" });
console.log("TITLE:", s.slideTitle==="新標題");
console.log("KP:", JSON.stringify(s.keyPoints)==='["a","b","c"]');
console.log("BEN:", JSON.stringify(s.benefits)==='["x","y"]');
console.log("CONC:", s.conclusion==="結");
const f=buildSlide({}, { title:"預設" });
console.log("FALLBACK:", f.slideTitle==="預設" && f.keyPoints.length===0);
```
執行確認全 true 後刪除暫存檔。

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 自動填寫同時生成一頁簡報內容"`

---

### Task 2: 移除獨立簡報按鈕與 generateSlide

**Files:**
- Modify: `v4/index.html`
- Modify: `v4/js/tab-narrative.js`

**Interfaces:**
- Consumes: Task 1 已將簡報生成併入 generateAll。
- Produces: 無 `slideBtn`、無 `generateSlide`。

- [ ] **Step 1: 移除 index.html 按鈕**

Modify `v4/index.html`：移除第 50 行 `slideBtn` 按鈕：
```html
        <button class="btn btn-outline" id="slideBtn" style="width:100%;margin-top:8px">生成一頁簡報</button>
```
（整行刪除。）

- [ ] **Step 2: 移除 initNarrative 綁定**

Modify `v4/js/tab-narrative.js`：移除第 111 行：
```js
  $("slideBtn").addEventListener("click",generateSlide);
```

- [ ] **Step 3: 移除 generateSlide 函式**

Modify `v4/js/tab-narrative.js`：刪除第 78-106 行 `generateSlide` 函式（含 `export async function generateSlide(){...}` 至其閉合 `}`）。

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/tab-narrative.js`（exit 0）

- [ ] **Step 5: 驗證無殘留**

Run: `Select-String -Path v4/index.html -Pattern "slideBtn"; Select-String -Path v4/js/tab-narrative.js -Pattern "slideBtn|generateSlide"`（應無輸出）。

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 移除獨立一頁簡報按鈕，整合至自動填寫"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（generateAll 三並行）→Task 1；2（移除按鈕）→Task 2；3（跨模板，共用 data 無需改）→無程式碼；不變項目維持。驗收 1-5 對應 Task 1 Step 5、Task 2 Step 5。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`data.slide` 建構（Task 1）與原 generateSlide（第 91 行）一致；`buildSlidePrompt(d)`（Task 1）與原 generateSlide 使用一致；`slideObj`（Task 1 results[2]）對應 buildSlidePrompt 回傳。
