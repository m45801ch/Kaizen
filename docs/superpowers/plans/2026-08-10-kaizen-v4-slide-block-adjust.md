# V4 簡報區塊調整（效益可移動/縮放/調層；其餘固定）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 標題/重點/結語三個區塊固定（不可拖、無調層按鈕、回歸排版）；效益圖表保留可移動＋修復調層＋新增拖拽縮放。

**Architecture:** `store.js` 加 memory-only `slideBlockSize`；slide render 移除 title/points/conclusion 的 `data-slide-block` 與按鈕、保留 benefits 的 block 標記並加 `data-slide-resize-block` 縮放手柄；`document.js` 效益拖拽排除縮放手柄、新增效益縮放 pointer handler；`base.css` 三區塊回歸 flow、benefits 保留 absolute + 縮放手柄樣式。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`、`v4/js/store.js`、`v4/css/base.css`。

## Global Constraints

- `state.slideBlockPos`/`state.slideBlockZ` 僅保留 benefits 使用（title/points/conclusion 不再使用，可保留欄位不刪）；`state.slideBlockSize`（`{[key]:{w,h}}`）memory-only。
- 標題/重點/結語**固定**：無 `data-slide-block`、無 `data-slide-block-z` 按鈕、無 inline position style、回歸 `.slide-page` flow。
- 效益圖表保留 `data-slide-block="benefits"` + `data-slide-block-z` 調層按鈕 + `data-slide-resize-block` 縮放手柄。
- 效益縮放：pointer 拖拽調整 `.slide-benefits` 的 width/height（min 80px），pointerup 寫 `state.slideBlockSize.benefits`，釋放 pointer capture；拖拽移動排除 `[data-slide-resize-block]`。
- 效益調層 z 範圍 `1..99`（與內容 z=1、照片 z=5 比較）。
- 監聽採「無條件註冊 + 事件時檢查 `getTemplate(state.template).id!=="slide"` return」。
- 照片機制、其他模板完全不動；`data.slide` 內容結構不變。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: store 加 slideBlockSize + slide render 調整

**Files:**
- Modify: `v4/js/store.js`
- Modify: `v4/js/document.js`（renderDocument view）
- Modify: `v4/js/templates/slide/index.js`

**Interfaces:**
- Produces: `state.slideBlockSize`；view 傳入；render 三區塊固定（無 block 標記/按鈕）、效益保留 block + 縮放手柄。

- [ ] **Step 1: store.js 加 slideBlockSize**

Modify `v4/js/store.js`：`state` 物件內、`slideBlockZ: {}`（第 28 行）之後加：
```js
  slideBlockZ: {},
  slideBlockSize: {}
```

- [ ] **Step 2: renderDocument view 加 slideBlockSize**

Modify `v4/js/document.js` 第 114 行 view 物件加 `slideBlockSize: state.slideBlockSize`：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos, slideZ: state.slideZ, slideBlockPos: state.slideBlockPos, slideBlockZ: state.slideBlockZ, slideBlockSize: state.slideBlockSize };
```

- [ ] **Step 3: slide render 調整**

Modify `v4/js/templates/slide/index.js`：
(a) `blockStyle`（第 97-108 行）改為只供 benefits 使用（保留原樣，title/points/conclusion 不再呼叫）。
(b) `zbtns`（第 109-112 行）保留（僅 benefits 呼叫）。
(c) 新增 `benefitsStyle`（含 block 標記 + 位置 + z + 尺寸）：
```js
    const benefitsStyle = ()=>{
      const pos = (d.slideBlockPos && d.slideBlockPos.benefits) || null;
      const z = (d.slideBlockZ && d.slideBlockZ.benefits) ?? 1;
      const sz = (d.slideBlockSize && d.slideBlockSize.benefits) || null;
      const posStyle = pos ? 'left:'+pos.x+'px;top:'+pos.y+'px' : 'left:auto;right:36px;top:104px';
      const sizeStyle = sz ? 'width:'+sz.w+'px;height:'+sz.h+'px' : '';
      return 'data-slide-block="benefits" style="'+posStyle+';z-index:'+z+';'+sizeStyle+'"';
    };
```
(d) render 回傳（第 113-120 行）改為：
```js
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title"><span class="slide-field" contenteditable="true" data-slide-field="slideTitle">'+esc(s.slideTitle||d.title||"改善提案")+"</span></div>"+
      '<ul class="slide-points">'+(points.length?points.map((k,i)=>"<li contenteditable=\"true\" data-slide-field=\"keyPoints-"+i+"\">"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+"</ul>"+
      (benefits.length?'<div class="slide-benefits" '+benefitsStyle()+'>'+gaChartBlock(benefits, chartType)+
        '<span class="resize-handle" data-slide-resize-block title="調整尺寸"></span>'+zbtns("benefits")+"</div>":"")+
      photoBlock+
      '<div class="slide-conclusion"><span class="slide-field" contenteditable="true" data-slide-field="conclusion">'+esc(s.conclusion||"")+"</span></div>"+
    "</div>";
```
（title/points/conclusion 不再有 block 標記/按鈕/inline style；benefits 保留 block + 縮放手柄 + 調層按鈕。）

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/store.js && node --check v4/js/document.js && node --check v4/js/templates/slide/index.js`（皆 exit 0）

- [ ] **Step 5: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-block-adjust.mjs
import slide from "../../v4/js/templates/slide/index.js";
const d = { slide:{slideTitle:"標題",keyPoints:["A","B"],benefits:["減少停機 50%","節省成本 30%","提升效率 20%"],chartType:"bar",conclusion:"結語"}, photos:{before:[],after:[]}, slidePhotoSize:{}, slidePhotoPos:{}, slideZ:{}, slideBlockPos:{}, slideBlockZ:{}, slideBlockSize:{} };
const def = slide.render(d);
console.log("TITLE_NO_BLOCK:", !def.includes('data-slide-block="title"'));
console.log("POINTS_NO_BLOCK:", !def.includes('data-slide-block="points"'));
console.log("CONCLUSION_NO_BLOCK:", !def.includes('data-slide-block="conclusion"'));
console.log("TITLE_NO_ZBTN:", !def.includes('data-slide-block-z="+1"') && !(def.match(/data-slide-block-z/g)||[]).length>1);
console.log("BENEFITS_BLOCK:", def.includes('data-slide-block="benefits"'));
console.log("BENEFITS_RESIZE:", def.includes('data-slide-resize-block'));
console.log("BENEFITS_ZBTN:", def.includes('data-slide-block-z="+1"'));
console.log("TITLE_FIELD_SPAN:", def.includes('class="slide-title"'));
const custom = slide.render({ ...d, slideBlockPos:{ benefits:{x:200,y:60} }, slideBlockZ:{ benefits:8 }, slideBlockSize:{ benefits:{w:320,h:200} } });
console.log("BENEFITS_CUSTOM:", custom.includes('data-slide-block="benefits" style="left:200px;top:60px;z-index:8;width:320px;height:200px"'));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 標題/重點/結語固定，效益區塊支援縮放"`

---

### Task 2: CSS 三區塊回歸 flow + 效益縮放手柄樣式

**Files:**
- Modify: `v4/css/base.css`（簡報區段）

**Interfaces:**
- Consumes: 三區塊（無 block 標記）、`.slide-benefits`（含 `data-slide-resize-block`）。
- Produces: title/points/conclusion 回歸 flow；benefits 保留 absolute；縮放手柄樣式。

- [ ] **Step 1: 調整 CSS**

Modify `v4/css/base.css`：先讀取簡報區段（第 153-185 行）現行規則，調整：

(a) 第 178-180 行（四區塊 absolute + cursor + li cursor）改為只留 benefits：
```css
.slide-page .slide-benefits{position:absolute;cursor:grab;touch-action:none}
.slide-page .slide-benefits:active{cursor:grabbing}
```
(b) 第 161 行 `min-width/min-height`（title/conclusion）移除（固定區塊不需）。
(c) 新增效益縮放手柄樣式：
```css
.slide-page .slide-benefits .resize-handle{position:absolute;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;background:rgba(255,255,255,.5);border-top-left-radius:8px}
```
（`.slide-benefits` 需 `position:relative` 供手柄定位 — 但 benefits 本身 absolute，加 `position:relative` 會衝突；改為手柄 `position:absolute` 相對於 benefits（absolute 元素可作 containing block），直接套用即可。）

- [ ] **Step 2: 驗證括號平衡**

PowerShell 統計 `v4/css/base.css` 的 `{`/`}` 數量須相等。

- [ ] **Step 3: Commit** `git commit -m "feat(v4): 簡報固定區塊回歸排版與效益縮放手柄樣式"`

---

### Task 3: document.js 效益拖拽排除縮放手柄 + 新增效益縮放

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `state.slideBlockSize`（Task 1）、`[data-slide-block]`/`[data-slide-resize-block]` 元素（Task 1）。
- Produces: 效益拖拽排除縮放手柄；效益縮放 pointer handler 寫 `state.slideBlockSize.benefits`。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 區塊拖拽 handler（約 466-509 行）與照片縮放 handler（約 368-397 行）。

- [ ] **Step 2: 修改區塊拖拽排除 + 新增效益縮放**

Modify `v4/js/document.js`：
(a) 區塊拖拽 handler 的排除清單（`if(e.target.closest("[data-slide-z]")||...)`）加 `e.target.closest("[data-slide-resize-block]")`：
```js
    if(e.target.closest("[data-slide-z]")||e.target.closest("[data-slide-block-z]")||e.target.closest("[data-slide-resize]")||e.target.closest("[data-slide-resize-block]")||e.target.closest("[data-slide-field]")) return;
```
(b) 新增效益縮放 handler（仿照片 `[data-slide-resize]` pattern，加在區塊調層 handler 之後）：
```js
  /* 簡報效益圖表縮放（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const handle = e.target.closest("[data-slide-resize-block]");
    if(!handle) return;
    if(e.button!==0) return;
    e.preventDefault();
    const block = handle.closest(".slide-benefits");
    if(!block) return;
    const pointerId = e.pointerId;
    const page = block.closest(".slide-page");
    const maxW = page ? Math.max(80, page.clientWidth - block.offsetLeft - 24) : 800;
    const maxH = page ? Math.max(80, page.clientHeight - block.offsetTop - 24) : 600;
    const startX = e.clientX, startY = e.clientY;
    const startW = block.offsetWidth, startH = block.offsetHeight;
    function onMove(ev){
      const w = Math.min(maxW, Math.max(80, startW + (ev.clientX - startX)));
      const h = Math.min(maxH, Math.max(80, startH + (ev.clientY - startY)));
      block.style.width = w+"px";
      block.style.height = h+"px";
    }
    function onUp(){
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onCancel);
      handle.removeEventListener("lostpointercapture", onCancel);
      if(handle.hasPointerCapture && handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      state.slideBlockSize.benefits = { w: block.offsetWidth, h: block.offsetHeight };
    }
    const onCancel = ()=>{ onUp(); };
    handle.setPointerCapture(pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
    handle.addEventListener("lostpointercapture", onCancel);
  });
```

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/document.js`（exit 0）

- [ ] **Step 4: 手動驗證（瀏覽器）**

本專案無測試框架，此為 DOM pointer/click 互動；以瀏覽器手動驗證（既有慣例）：
1. 生成一頁簡報。
2. 標題/重點/結語固定：不可拖動、無調層按鈕、排版正常。
3. 效益圖表可拖到版面任意位置、可拖縮放手柄調整大小。
4. 效益「↑/↓」按鈕可調整與內容/照片的上下層。
5. 刷新恢復預設；列印不顯示按鈕/手柄。
6. 照片機制不受影響。

- [ ] **Step 5: Commit** `git commit -m "feat(v4): 效益圖表拖拽排除縮放並新增尺寸調整"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（三區塊固定）→Task 1；2（效益保留+縮放手柄）→Task 1；3（調層修復）→維持既有 handler（Task 3 不影響）；4（效益縮放）→Task 3；5（CSS）→Task 2。驗收 1-6 對應 Task 1 Step 5、Task 3 Step 4。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`slideBlockSize`（Task 1 定義/傳入、Task 3 寫入）、`data-slide-resize-block`（Task 1 產生、Task 3 `closest`）、`state.slideBlockSize.benefits`（Task 3 寫入、Task 1 `benefitsStyle` 讀 `d.slideBlockSize.benefits`）、`.slide-benefits`（各處一致）一致。
