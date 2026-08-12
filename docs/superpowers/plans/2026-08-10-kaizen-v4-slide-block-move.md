# V4 簡報文字/表格區塊拖拽移動＋調層級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一頁簡報的標題、重點列表、效益圖表、結語四個區塊可各自拖到版面任意位置，並有「上移/下移一層」按鈕調整上下層；僅本次會話有效。

**Architecture:** `store.js` 加 memory-only `slideBlockPos`/`slideBlockZ`（key 固定 `title/points/benefits/conclusion`）；slide render 四區塊加 `data-slide-block` 標記並 `position:absolute`（相對於 `.slide-page`），含 `data-slide-block-z` 調層按鈕；`document.js` 仿照片加拖拽與調層 handler；`base.css` 加區塊定位/drag stage/按鈕樣式。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`、`v4/js/store.js`、`v4/css/base.css`。

## Global Constraints

- `state.slideBlockPos`/`state.slideBlockZ` 只存記憶體，不寫入 localStorage/IndexedDB；刷新恢復預設。
- `blockKey` 固定字串：`title`、`points`、`benefits`、`conclusion`。
- 四區塊定位基準是 `.slide-page`（`position:relative`）；拖拽 `maxX/maxY` 用 `page.clientWidth/Height - target.offsetWidth/Height`。
- 內容 z-index 預設 1（`slideBlockZ[key] ?? 1`）；照片 z-index 預設 5、範圍 0..99；調層按鈕範圍 `1..99`。
- 拖拽時只改 `left/top`，不呼叫 `renderDocument()`；調層時只改該區塊 `style.zIndex`。
- 監聽採「無條件註冊 + 事件時檢查 `getTemplate(state.template).id!=="slide"` return」。
- 拖區塊空白處移動、點文字（contenteditable）可編輯、點調層按鈕只調層；排除 `[data-slide-z]`/`[data-slide-block-z]`/`[data-slide-resize]`。
- 拖拽/調層 pointer capture 須釋放（`hasPointerCapture`+`releasePointerCapture`）。
- 照片機制、其他模板完全不動；`data.slide` 內容結構不變。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: store 加 slideBlockPos/slideBlockZ + slide render 四區塊標記

**Files:**
- Modify: `v4/js/store.js`
- Modify: `v4/js/document.js`（renderDocument view）
- Modify: `v4/js/templates/slide/index.js`

**Interfaces:**
- Produces: `state.slideBlockPos`/`state.slideBlockZ`；view 傳入；render 四區塊含 `data-slide-block` 與 `data-slide-block-z`，`position:absolute` 於 `.slide-page`。

- [ ] **Step 1: store.js 加欄位**

Modify `v4/js/store.js`：`state` 物件內、`slideZ: {}`（第 25 行）之後加：
```js
  slideZ: {},
  slideBlockPos: {},
  slideBlockZ: {}
```

- [ ] **Step 2: renderDocument view 加欄位**

Modify `v4/js/document.js` 第 114 行：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos, slideZ: state.slideZ };
```
改為：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos, slideZ: state.slideZ, slideBlockPos: state.slideBlockPos, slideBlockZ: state.slideBlockZ };
```

- [ ] **Step 3: slide render 四區塊加標記與定位**

Modify `v4/js/templates/slide/index.js`：`render` 回傳（第 97-106 行）改為（各區塊加 `data-slide-block`、`data-slide-block-z` 按鈕、`position:absolute` 預設位置）：

```js
    const blockStyle = (key)=>{
      const pos = (d.slideBlockPos && d.slideBlockPos[key]) || null;
      const z = (d.slideBlockZ && d.slideBlockZ[key]) ?? 1;
      const def = {
        title:'left:36px;top:28px',
        points:'left:36px;top:104px',
        benefits:'left:auto;right:36px;top:104px',
        conclusion:'left:36px;bottom:28px'
      }[key] || '';
      const posStyle = pos ? 'left:'+pos.x+'px;top:'+pos.y+'px' : def;
      return 'style="'+posStyle+';z-index:'+z+'" data-slide-block="'+key+'"';
    };
    const zbtns = (key)=>'<span class="slide-z-btns">'+
      '<button type="button" data-slide-block-z="+1" title="上移一層">↑</button>'+
      '<button type="button" data-slide-block-z="-1" title="下移一層">↓</button>'+
    "</span>";
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title" contenteditable="true" data-slide-field="slideTitle" '+blockStyle("title")+'>'+esc(s.slideTitle||d.title||"改善提案")+zbtns("title")+"</div>"+
      '<div class="slide-body">'+
        '<ul class="slide-points" '+blockStyle("points")+'>'+(points.length?points.map((k,i)=>"<li contenteditable=\"true\" data-slide-field=\"keyPoints-"+i+"\">"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+zbtns("points")+"</ul>"+
        (benefits.length?'<div class="slide-benefits" '+blockStyle("benefits")+'>'+gaChartBlock(benefits, chartType)+zbtns("benefits")+"</div>":"")+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion" contenteditable="true" data-slide-field="conclusion" '+blockStyle("conclusion")+'>'+esc(s.conclusion||"")+zbtns("conclusion")+"</div>"+
    "</div>";
```
說明：`blockStyle` 產生含預設/已存位置的 `style` 與 `data-slide-block` 標記；`zbtns` 產生調層按鈕（放區塊內、區塊設 `position:relative` 供按鈕絕對定位）。`.slide-tag` 不加 block 標記（固定頂部標籤）。

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/store.js && node --check v4/js/document.js && node --check v4/js/templates/slide/index.js`（皆 exit 0）

- [ ] **Step 5: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-block-render.mjs
import slide from "../../v4/js/templates/slide/index.js";
const d = { slide:{slideTitle:"標題",keyPoints:["A","B"],benefits:["減少停機 50%","節省成本 30%","提升效率 20%"],chartType:"bar",conclusion:"結語"}, photos:{before:[],after:[]}, slidePhotoSize:{}, slidePhotoPos:{}, slideZ:{}, slideBlockPos:{}, slideBlockZ:{} };
const def = slide.render(d);
console.log("TITLE_BLOCK:", def.includes('data-slide-block="title" style="left:36px;top:28px;z-index:1"'));
console.log("POINTS_BLOCK:", def.includes('data-slide-block="points"'));
console.log("BENEFITS_BLOCK:", def.includes('data-slide-block="benefits"'));
console.log("CONCLUSION_BLOCK:", def.includes('data-slide-block="conclusion"'));
console.log("ZBTNS_PRESENT:", (def.match(/data-slide-block-z="\+1"/g)||[]).length>=4);
const custom = slide.render({ ...d, slideBlockPos:{ title:{x:200,y:50} }, slideBlockZ:{ title:8 } });
console.log("CUSTOM_POS_Z:", custom.includes('data-slide-block="title" style="left:200px;top:50px;z-index:8"'));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 簡報文字/表格區塊標記與定位"`

---

### Task 2: CSS 區塊定位與 drag stage

**Files:**
- Modify: `v4/css/base.css`（簡報區段）

**Interfaces:**
- Consumes: `[data-slide-block]` 元素（Task 1）、`.slide-z-btns`（已有）。
- Produces: 四區塊 `position:absolute` 於 `.slide-page`、drag stage 高度、按鈕樣式。

- [ ] **Step 1: 調整 CSS**

Modify `v4/css/base.css`：先讀取簡報區段（第 153-185 行）現行規則，調整 `.slide-page`、`.slide-body` 並新增區塊定位規則：

```css
.slide-page{min-height:70vh}
.slide-page .slide-body{position:relative}
.slide-page .slide-title,.slide-page .slide-points,.slide-page .slide-benefits,.slide-page .slide-conclusion{position:absolute;cursor:grab;touch-action:none}
.slide-page .slide-title:active,.slide-page .slide-points:active,.slide-page .slide-benefits:active,.slide-page .slide-conclusion:active{cursor:grabbing}
.slide-page .slide-points li{cursor:grab}
```
（`.slide-page .slide-z-btns` 規則已存在於第 171 行（`top:2px;right:0`），照片與文字區塊共用，不需重設。`@media print` 隱藏 `.slide-z-btns` 已有，保留。）

- [ ] **Step 2: 驗證括號平衡**

PowerShell 統計 `v4/css/base.css` 的 `{`/`}` 數量須相等。

- [ ] **Step 3: Commit** `git commit -m "feat(v4): 簡報文字/表格區塊定位與拖拽樣式"`

---

### Task 3: bindDocument 區塊拖拽與調層綁定

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `state.slideBlockPos`/`state.slideBlockZ`（Task 1）、`[data-slide-block]`/`[data-slide-block-z]` 元素（Task 1）。
- Produces: 四區塊拖拽（pointer）寫 `state.slideBlockPos[key]`；調層（click）寫 `state.slideBlockZ[key]` + `style.zIndex`。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 第 449-464 行（調層 handler）與 399-447 行（照片拖拽 handler），確認插入點與既有 pattern。

- [ ] **Step 2: 加區塊拖拽與調層綁定**

Modify `v4/js/document.js`：在照片調層 handler 之後新增（仿照片 pattern）：

```js
  /* 簡報文字/表格區塊拖拽移動（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    if(e.button!==0) return;
    const target = e.target.closest("[data-slide-block]");
    if(!target) return;
    if(e.target.closest("[data-slide-z]")||e.target.closest("[data-slide-block-z]")||e.target.closest("[data-slide-resize]")) return;
    if(e.target.closest("[data-slide-field]")) return;
    e.preventDefault();
    const key = target.dataset.slideBlock;
    const page = target.closest(".slide-page");
    if(target.style.right && target.style.right!=="auto"){
      const curLeft = target.offsetLeft;
      target.style.right="auto";
      target.style.left = curLeft+"px";
    }
    const pointerId = e.pointerId;
    const maxX = page ? Math.max(0, page.clientWidth - target.offsetWidth) : 800;
    const maxY = page ? Math.max(0, page.clientHeight - target.offsetHeight) : 600;
    const startX = e.clientX, startY = e.clientY;
    const baseX = target.offsetLeft, baseY = target.offsetTop;
    function onMove(ev){
      const nx = Math.max(0, Math.min(maxX, baseX + (ev.clientX - startX)));
      const ny = Math.max(0, Math.min(maxY, baseY + (ev.clientY - startY)));
      target.style.left = nx+"px";
      target.style.top = ny+"px";
    }
    function onUp(){
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onCancel);
      target.removeEventListener("lostpointercapture", onCancel);
      if(target.hasPointerCapture && target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      state.slideBlockPos[key] = { x: target.offsetLeft, y: target.offsetTop };
    }
    const onCancel = ()=>{ onUp(); };
    target.setPointerCapture(pointerId);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onCancel);
  });

  /* 簡報文字/表格區塊調層（上移/下移一層） */
  doc.addEventListener("click", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const btn = e.target.closest("[data-slide-block-z]");
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const block = btn.closest("[data-slide-block]");
    if(!block) return;
    const key = block.dataset.slideBlock;
    const delta = parseInt(btn.dataset.slideBlockZ, 10) || 0;
    const cur = state.slideBlockZ[key] ?? 1;
    const next = Math.max(1, Math.min(99, cur + delta));
    state.slideBlockZ[key] = next;
    block.style.zIndex = String(next);
  });
```
說明：拖拽排除 `[data-slide-field]`（contenteditable 文字），避免拖動與編輯衝突（點文字進入編輯、拖區塊空白處移動）。

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/document.js`（exit 0）

- [ ] **Step 4: 手動驗證（瀏覽器）**

本專案無測試框架，此為 DOM pointer/click 互動；以瀏覽器手動驗證（既有慣例）：
1. 生成一頁簡報。
2. 拖標題/重點/效益圖表/結語區塊空白處 → 各自移動到版面任意位置。
3. 點區塊文字 → 可編輯（拖動不阻斷編輯）。
4. 點各區塊「↑/↓」→ z-index 變化，可與其他區塊/照片互疊。
5. 刷新 → 恢復預設排版。
6. 照片機制、列印仍正常（調層按鈕列印隱藏）。

- [ ] **Step 5: Commit** `git commit -m "feat(v4): 簡報文字/表格區塊拖拽與調層綁定"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（記憶）→Task 1；2（render 標記）→Task 1；3（綁定）→Task 3；4（CSS）→Task 2；5（預設位置）→Task 1 `blockStyle`。驗收 1-6 對應 Task 1 Step 5、Task 3 Step 4。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`slideBlockPos`/`slideBlockZ`（Task 1 定義/傳入、Task 3 寫入）、`data-slide-block`（Task 1 產生、Task 3 `target.dataset.slideBlock`）、`data-slide-block-z`（Task 1 產生、Task 3 `btn.dataset.slideBlockZ`）、`blockKey`（title/points/benefits/conclusion，Task 1 `blockStyle` 預設 map 與 Task 3 一致）、`.slide-z-btns`（Task 2 CSS 共用）各處一致。
