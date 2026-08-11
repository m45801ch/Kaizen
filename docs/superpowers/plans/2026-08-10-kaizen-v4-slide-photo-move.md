# V4 一頁簡報照片拖拽移動位置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一頁簡報（slide）模板的改善前/後照片可隨意在版面拖動改變位置；僅本次會話有效、各版面獨立（不動照片物件 `dispX/dispY`）。

**Architecture:** memory-only `state.slidePhotoPos`（`{[photoId]:{x,y}}`，不持久化）；`renderDocument` 把它加進 `view` 傳給 slide render；slide render 的 `.slide-photo` 改為 `position:absolute` 並加 `data-slide-pos` 標記；`document.js` `bindDocument` 用 pointer pattern（無條件註冊 + 事件時檢查 slide 模板，沿用先前縮放修復模式）綁定拖拽，pointerup 寫入 map。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`、`v4/js/store.js`、`v4/css/base.css`。

## Global Constraints

- `state.slidePhotoPos` 只存記憶體，不寫入 localStorage/IndexedDB；刷新恢復預設。
- slide 模板只讀 `state.slidePhotoPos`，完全不讀寫照片物件的 `dispX/dispY`。
- 預設位置：改善前 `left:0;top:0`、改善後 `left:auto;right:0;top:0`（靠右）。
- 拖拽時只改該照片 DOM 的 `left/top`，不呼叫 `renderDocument()`。
- 監聽採「無條件註冊 `doc.addEventListener("pointerdown")` + handler 內 `if(getTemplate(state.template).id!=="slide") return;`」（避免 bound 守衛 lock；對照既有 `.resize-handle`/照片移動 pattern）。
- 拖拽縮放手柄（`[data-slide-resize]`）與照片本體（`[data-slide-pos]`）需避免衝突：拖手柄不觸發移動。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: store 加 slidePhotoPos + renderDocument 傳入 view

**Files:**
- Modify: `v4/js/store.js`（state 定義）
- Modify: `v4/js/document.js`（`renderDocument` view）

**Interfaces:**
- Produces: `state.slidePhotoPos`（`{[photoId]:{x:number,y:number}}`）；`view.slidePhotoPos`（傳給模板 render）。

- [ ] **Step 1: store.js 加欄位**

Modify `v4/js/store.js`：`state` 物件內、`slidePhotoSize: {}`（第 23 行）之後加：
```js
  slidePhotoSize: {},
  slidePhotoPos: {}
```

- [ ] **Step 2: renderDocument view 加 slidePhotoPos**

Modify `v4/js/document.js` 第 114 行：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize };
```
改為：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos };
```

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/store.js && node --check v4/js/document.js`（皆 exit 0）

- [ ] **Step 4: Commit** `git commit -m "feat(v4): 新增 slidePhotoPos 記憶狀態並傳入模板 view"`

---

### Task 2: slide 模板照片改絕對定位容器 + CSS

**Files:**
- Modify: `v4/js/templates/slide/index.js`（render 照片區）
- Modify: `v4/css/base.css`（簡報照片定位樣式）

**Interfaces:**
- Consumes: `d.photos.before[0]`/`d.photos.after[0]`、`d.slidePhotoSize`、`d.slidePhotoPos`。
- Produces: `.slide-photo` 為 `position:absolute` 並含 `data-slide-pos="photoId"`；依 `slidePhotoPos` 或預設 `left/top` 放置。

- [ ] **Step 1: 修改 slide render 照片區**

Modify `v4/js/templates/slide/index.js`：`render` 內 `slidePhoto`（第 74-85 行）與 `photoBlock`（第 86-88 行）改為：

```js
    const slidePhoto = (p, label, side)=>{
      if(!p) return "";
      const ratio = (p.w && p.h) ? p.h/p.w : 1;
      const sz = (d.slidePhotoSize && d.slidePhotoSize[p.id]) || null;
      const pos = (d.slidePhotoPos && d.slidePhotoPos[p.id]) || null;
      const w = sz ? sz.w : 240;
      const h = sz ? sz.h : Math.max(40, Math.round(240*ratio));
      const style = pos
        ? 'left:'+pos.x+'px;top:'+pos.y+'px'
        : (side==="after" ? 'left:auto;right:0;top:0' : 'left:0;top:0');
      return '<div class="slide-photo" data-slide-pos="'+esc(p.id)+'" style="'+style+'"><span class="slide-photo-tag">'+label+'</span>'+
        '<div class="slide-photo-frame" data-slide-photo="'+esc(p.id)+'" style="width:'+w+'px;height:'+h+'px">'+
        '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+label+'">'+
        '<span class="resize-handle" data-slide-resize="'+esc(p.id)+'" title="調整尺寸"></span>'+
        "</div></div>";
    };
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+slidePhoto(photosBefore[0], "改善前", "before")+slidePhoto(photosAfter[0], "改善後", "after")+"</div>"
      : "";
```

- [ ] **Step 2: base.css 加樣式**

Modify `v4/css/base.css`：調整 `.slide-page .slide-photos` 與 `.slide-page .slide-photo`（現第 168-184 行附近）。先讀取現行規則後，將 `.slide-page .slide-photos` 改為 `position:relative` 容器、`.slide-page .slide-photo` 改為 `position:absolute`：

```css
.slide-page .slide-photos{position:relative;min-height:60px;margin-bottom:10px}
.slide-page .slide-photo{position:absolute;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
```

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/templates/slide/index.js`（exit 0）

- [ ] **Step 4: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-slide-move.mjs
import slide from "../../v4/js/templates/slide/index.js";
const photos = { before:[{id:"p1",w:400,h:300,dataUrl:"data:image/jpeg;base64,AA=="}], after:[{id:"p2",w:400,h:300,dataUrl:"data:image/jpeg;base64,AA=="}] };
const def = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{}, slidePhotoPos:{} });
console.log("BEFORE_LEFT0:", def.includes('data-slide-pos="p1" style="left:0;top:0"'));
console.log("AFTER_RIGHT:", def.includes('data-slide-pos="p2" style="left:auto;right:0;top:0"'));
const custom = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{}, slidePhotoPos:{ p1:{x:120,y:80} } });
console.log("CUSTOM_POS:", custom.includes('data-slide-pos="p1" style="left:120px;top:80px"'));
console.log("HANDLE_PRESENT:", custom.includes('data-slide-resize="p1"'));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 5: Commit** `git commit -m "feat(v4): 簡報照片改絕對定位容器支援拖拽移動"`

---

### Task 3: bindDocument 綁定簡報照片拖拽移動

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `state.slidePhotoPos`（Task 1）、`[data-slide-pos]` 元素（Task 2）。
- Produces: slide 模板下拖拽照片更新 `left/top`，pointerup 寫入 `state.slidePhotoPos[photoId]`。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 第 293-330 行（既有「照片移動：拖照片本體」pointer 實作）與第 385-395 行（簡報縮放區塊結尾）。

- [ ] **Step 2: 加簡報照片移動綁定**

Modify `v4/js/document.js`：在既有「照片移動」區塊之後（或 `bindDocument` 內任一處、`doc.dataset.bound` 守衛之後亦可，因採事件時檢查）新增：

```js
  /* 簡報照片拖拽移動（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const target = e.target.closest("[data-slide-pos]");
    if(!target) return;
    if(e.target.closest("[data-slide-resize]")) return;
    e.preventDefault();
    const id = target.dataset.slidePos;
    const zone = target.closest(".slide-photos");
    const maxX = zone ? Math.max(0, zone.clientWidth - target.offsetWidth) : 800;
    const maxY = zone ? Math.max(0, zone.clientHeight - target.offsetHeight) : 600;
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
      state.slidePhotoPos[id] = { x: target.offsetLeft, y: target.offsetTop };
    }
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  });
```

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/document.js`（exit 0）

- [ ] **Step 4: 手動驗證（瀏覽器）**

本專案無測試框架，此為 DOM pointer 互動；以瀏覽器手動驗證（與先前簡報縮放相同慣例）：
1. 生成一頁簡報（或有照片的 slide 模板）。
2. 拖拽照片本體 → 照片隨滑鼠移動；拖縮放手柄 → 只縮放不移動。
3. 拖到版面任意位置皆可（限制在 `.slide-photos` 容器內）。
4. 切到其他模板再切回 → 簡報照片維持拖動後位置。
5. 刷新頁面 → 照片恢復預設（改善前左、改善後右）。
6. 其他模板照片拖動仍正常。

- [ ] **Step 5: Commit** `git commit -m "feat(v4): 簡報照片拖拽移動位置"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（記憶）→Task 1；2（render 絕對定位）→Task 2；3（綁定）→Task 3；4（CSS）→Task 2。驗收 1-5 對應 Task 2 Step 4、Task 3 Step 4。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`state.slidePhotoPos`（Task 1 定義、Task 3 寫入）、`view.slidePhotoPos`（Task 1 傳入、Task 2 讀 `d.slidePhotoPos`）、`data-slide-pos`（Task 2 產生、Task 3 `target.dataset.slidePos`）、`.slide-photos`/`.slide-photo`（Task 2 CSS、Task 3 closest）各處一致。拖拽與縮放手柄衝突防護（`e.target.closest("[data-slide-resize]")` return）已含。
