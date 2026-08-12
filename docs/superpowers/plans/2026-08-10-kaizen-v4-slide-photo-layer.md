# V4 簡報照片全版面移動＋覆蓋＋z-index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一頁簡報照片可在整個 `slide-page` 版面任意拖動、可覆蓋文字/表格、有「上移/下移一層」按鈕調整 z-index，並修復拖拽不穩。

**Architecture:** `store.js` 加 memory-only `slideZ`；slide render 照片直接 `position:absolute` 於 `.slide-page`（去 `.slide-photos` 容器），含 `data-slide-z` 調層按鈕；`document.js` 拖拽基準改為 `.slide-page` + 排除調層按鈕，新增 click 調層綁定；`base.css` 加 touch-action/cursor/按鈕樣式。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`、`v4/js/store.js`、`v4/css/base.css`。

## Global Constraints

- `state.slideZ` 只存記憶體，不寫入 localStorage/IndexedDB；刷新恢復預設 z-index 5。
- slide 模板只讀 `state.slideZ`，完全不讀寫照片物件的 `dispX/dispY/dispW/dispH`。
- 照片定位基準是 `.slide-page`（`position:relative`）；拖拽 `maxX/maxY` 用 `page.clientWidth/Height - target.offsetWidth/Height`。
- 拖拽時只改 `left/top`，不呼叫 `renderDocument()`；調層時只改該照片 `style.zIndex`。
- 監聽採「無條件註冊 + 事件時檢查 `getTemplate(state.template).id!=="slide"` return」。
- 拖照片本體（`[data-slide-pos]` 的 frame）可拖；拖縮放手柄（`[data-slide-resize]`）不拖；點調層按鈕（`[data-slide-z]`）不拖。
- 其他模板（generic/safety/quality）照片機制完全不動；縮放機制不變。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: store 加 slideZ + slide render 改全版面定位與調層按鈕

**Files:**
- Modify: `v4/js/store.js`
- Modify: `v4/js/templates/slide/index.js`

**Interfaces:**
- Produces: `state.slideZ`（`{[photoId]:number}`）；render 照片直接 `position:absolute` 於 `.slide-page`，z-index 依 `slideZ` 或 5，含 `data-slide-z` 按鈕。

- [ ] **Step 1: store.js 加 slideZ**

Modify `v4/js/store.js`：`state` 物件內、`slidePhotoPos: {}`（第 24 行）之後加：
```js
  slidePhotoPos: {},
  slideZ: {}
```

- [ ] **Step 2: renderDocument view 加 slideZ**

Modify `v4/js/document.js` 第 114 行：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos };
```
改為：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos, slideZ: state.slideZ };
```

- [ ] **Step 3: slide render 改全版面定位 + 調層按鈕**

Modify `v4/js/templates/slide/index.js`：`render` 內 `slidePhoto`（第 74-89 行）改為（照片直接置於 `.slide-page`，移除 `.slide-photos` 容器包裝）：

```js
    const slidePhoto = (p, label, side)=>{
      if(!p) return "";
      const ratio = (p.w && p.h) ? p.h/p.w : 1;
      const sz = (d.slidePhotoSize && d.slidePhotoSize[p.id]) || null;
      const pos = (d.slidePhotoPos && d.slidePhotoPos[p.id]) || null;
      const z = (d.slideZ && d.slideZ[p.id]) || 5;
      const w = sz ? sz.w : 240;
      const h = sz ? sz.h : Math.max(40, Math.round(240*ratio));
      const style = (pos ? 'left:'+pos.x+'px;top:'+pos.y+'px' : (side==="after" ? 'left:auto;right:0;top:0' : 'left:0;top:0'))+';z-index:'+z;
      return '<div class="slide-photo" data-slide-pos="'+esc(p.id)+'" style="'+style+'"><span class="slide-photo-tag">'+label+'</span>'+
        '<div class="slide-photo-frame" data-slide-photo="'+esc(p.id)+'" style="width:'+w+'px;height:'+h+'px">'+
        '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+label+'">'+
        '<span class="resize-handle" data-slide-resize="'+esc(p.id)+'" title="調整尺寸"></span>'+
        "</div>"+
        '<span class="slide-z-btns">'+
          '<button type="button" data-slide-z="+1" title="上移一層">↑</button>'+
          '<button type="button" data-slide-z="-1" title="下移一層">↓</button>'+
        "</span>"+
      "</div>";
    };
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? slidePhoto(photosBefore[0], "改善前", "before")+slidePhoto(photosAfter[0], "改善後", "after")
      : "";
```

`photoBlock` 改為直接輸出兩張照片字串（不再包 `.slide-photos` 容器），render 的 `photoBlock+` 位置不變。

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/store.js && node --check v4/js/document.js && node --check v4/js/templates/slide/index.js`（皆 exit 0）

- [ ] **Step 5: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-slide-layer.mjs
import slide from "../../v4/js/templates/slide/index.js";
const photos = { before:[{id:"p1",w:400,h:300,dataUrl:"data:image/jpeg;base64,AA=="}], after:[{id:"p2",w:400,h:300,dataUrl:"data:image/jpeg;base64,AA=="}] };
const def = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{}, slidePhotoPos:{}, slideZ:{} });
console.log("BEFORE_Z5:", def.includes('data-slide-pos="p1" style="left:0;top:0;z-index:5"'));
console.log("AFTER_RIGHT:", def.includes('data-slide-pos="p2" style="left:auto;right:0;top:0;z-index:5"'));
console.log("Z_BUTTONS:", def.includes('data-slide-z="+1"') && def.includes('data-slide-z="-1"'));
console.log("NO_PHOTOS_WRAPPER:", !def.includes('class="slide-photos"'));
const custom = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{}, slidePhotoPos:{ p1:{x:120,y:80} }, slideZ:{ p1:8 } });
console.log("CUSTOM_POS_Z8:", custom.includes('data-slide-pos="p1" style="left:120px;top:80px;z-index:8"'));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 簡報照片全版面定位與調層按鈕"`

---

### Task 2: CSS 全版面移動與調層按鈕樣式

**Files:**
- Modify: `v4/css/base.css`（簡報區段）

**Interfaces:**
- Consumes: `.slide-photo`（Task 1 輸出，`position:absolute` 於 `.slide-page`）、`.slide-z-btns`。
- Produces: 照片可全版面覆蓋、拖拽穩定、按鈕樣式。

- [ ] **Step 1: 調整 CSS**

Modify `v4/css/base.css`：先讀取簡報區段（第 153-182 行）現行規則，將 `.slide-page .slide-photos` 規則移除，`.slide-page .slide-photo` 與新增規則調整為：

```css
.slide-page .slide-photo{position:absolute;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:grab;z-index:5}
.slide-page .slide-photo:active{cursor:grabbing}
.slide-page .slide-photo-frame{touch-action:none}
.slide-page .slide-z-btns{position:absolute;top:-8px;right:0;display:flex;gap:2px;z-index:2}
.slide-page .slide-z-btns button{width:18px;height:18px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.4);border-radius:4px;background:rgba(15,23,42,.8);color:#fff;cursor:pointer;padding:0}
```
（移除 `.slide-page .slide-photos{...}` 規則；`.slide-photo-frame`/`img`/`resize-handle` 既有規則保留。）

- [ ] **Step 2: 驗證 CSS 括號平衡**

Run: PowerShell 統計 `v4/css/base.css` 中 `{` 與 `}` 數量，須相等。

- [ ] **Step 3: Commit** `git commit -m "feat(v4): 簡報照片全版面移動與調層按鈕樣式"`

---

### Task 3: bindDocument 拖拽基準改全版面 + 調層按鈕綁定

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `state.slideZ`（Task 1）、`[data-slide-pos]`/`[data-slide-z]` 元素（Task 1）。
- Produces: 拖拽基準 `.slide-page`（全版面）；`[data-slide-z]` click 調整 `state.slideZ[id]` + 更新該照片 z-index。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 第 398-430 行（現有簡報照片拖拽移動 handler）。

- [ ] **Step 2: 修改拖拽基準 + 排除調層按鈕**

Modify `v4/js/document.js`：現有簡報照片拖拽 handler（第 398-430 行）改為：

```js
  /* 簡報照片拖拽移動（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    if(e.button!==0) return;
    const target = e.target.closest("[data-slide-pos]");
    if(!target) return;
    if(e.target.closest("[data-slide-resize]")) return;
    if(e.target.closest("[data-slide-z]")) return;
    e.preventDefault();
    const id = target.dataset.slidePos;
    const page = target.closest(".slide-page");
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
      state.slidePhotoPos[id] = { x: target.offsetLeft, y: target.offsetTop };
    }
    const onCancel = ()=>{ onUp(); };
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onCancel);
  });

  /* 簡報照片調層（上移/下移一層） */
  doc.addEventListener("click", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const btn = e.target.closest("[data-slide-z]");
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const photo = btn.closest("[data-slide-pos]");
    if(!photo) return;
    const id = photo.dataset.slidePos;
    const delta = parseInt(btn.dataset.slideZ, 10) || 0;
    const cur = state.slideZ[id] || 5;
    const next = Math.max(1, Math.min(99, cur + delta));
    state.slideZ[id] = next;
    photo.style.zIndex = String(next);
  });
```

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/document.js`（exit 0）

- [ ] **Step 4: 手動驗證（瀏覽器）**

本專案無測試框架，此為 DOM pointer/click 互動；以瀏覽器手動驗證（既有慣例）：
1. 生成一頁簡報（或有照片的 slide 模板）。
2. 拖照片本體 → 可在整個 slide-page 版面移動（含標題/文字上方）。
3. 點「↑/↓」按鈕 → 該照片 z-index 變化，可覆蓋/被覆蓋文字與表格。
4. 拖縮放手柄 → 只縮放；點調層按鈕 → 只調層；拖照片 → 只移動，互不干擾。
5. 刷新 → 照片恢復預設（改善前左、改善後右、z-index 5）。
6. 其他模板照片拖動/縮放仍正常。

- [ ] **Step 5: Commit** `git commit -m "feat(v4): 簡報照片全版面拖拽與調層綁定"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（定位基準）→Task 1+2；2（slideZ 記憶）→Task 1；3（調層按鈕）→Task 1+3；4（拖拽修復）→Task 3；5（CSS）→Task 2。驗收 1-6 對應 Task 1 Step 5、Task 3 Step 4。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`state.slideZ`（Task 1 定義、Task 3 寫入）、`view.slideZ`（Task 1 傳入、Task 1 讀 `d.slideZ`）、`data-slide-z="+1"/"-1"`（Task 1 產生、Task 3 `btn.dataset.slideZ` + `parseInt`）、`data-slide-pos`（Task 1 產生、Task 3 `target.dataset.slidePos`）、`.slide-page`/`.slide-photo`/`.slide-z-btns`（各處一致）。拖拽/縮放/調層三者防護（`[data-slide-resize]`/`[data-slide-z]` return + `e.button===0`）已含。
