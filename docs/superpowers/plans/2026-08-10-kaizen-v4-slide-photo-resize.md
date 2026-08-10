# V4 一頁簡報圖片拖拽縮放 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一頁簡報（slide）模板的改善前/後照片可透過角落縮放手柄拖拽調整大小；僅本次會話有效、各版面獨立（不動 `dispW/dispH`）。

**Architecture:** memory-only `state.slidePhotoSize`（`{[photoId]:{w,h}}`，不持久化）；`renderDocument` 把它加進 `view` 傳給 slide render；slide render 用 `.slide-photo-frame` 容器 + `data-slide-resize` 縮放手柄；`document.js` `bindDocument` 用既有 resize-handle pointer pattern 綁定，拖拽只改該 frame 樣式，pointerup 寫回 map。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`、`v4/js/store.js`、`v4/css/base.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「Node 直調 render 驗證輸出」+「本機伺服器手動操作瀏覽器」。
- `state.slidePhotoSize` 只存記憶體，**不寫入 localStorage/IndexedDB**；刷新恢復預設。
- slide 模板**只讀** `state.slidePhotoSize`，完全不讀寫照片物件的 `dispW/dispH`（各版面獨立）。
- 預設照片尺寸：寬 240px、高 `Math.max(40, Math.round(240*ratio))`（ratio = `p.h/p.w`）。
- 縮放最小值 40px；最大寬度為所在容器 `clientWidth - 24`。
- 縮放手柄用 `data-slide-resize`（避免與其他模板 `data-resize` 衝突）；僅在 slide 模板下綁定。
- 拖拽時**只改該照片 frame 的 DOM 樣式**，不呼叫 `renderDocument()`。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: store 加 slidePhotoSize + renderDocument 傳入 view

**Files:**
- Modify: `v4/js/store.js`（state 定義）
- Modify: `v4/js/document.js`（`renderDocument` view）

**Interfaces:**
- Produces: `state.slidePhotoSize`（`{[photoId]:{w:number,h:number}}`）；`view.slidePhotoSize`（傳給模板 render 的同物件）。

- [ ] **Step 1: store.js 加欄位**

Modify `v4/js/store.js`：`state` 物件（第 12-23 行）內、`images` 之後加：
```js
  images: { before:[], after:[] },
  slidePhotoSize: {}
```
（`images` 為第 22 行，第 23 行為閉合 `};`。加在 `images` 後、`};` 前。）

- [ ] **Step 2: renderDocument view 加 slidePhotoSize**

Modify `v4/js/document.js`：`renderDocument` 第 108 行：
```js
  const view = { ...data, photos: state.images };
```
改為：
```js
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize };
```

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/store.js && node --check v4/js/document.js`
Expected: 兩者 exit 0。

- [ ] **Step 4: Commit**

```bash
git add v4/js/store.js v4/js/document.js
git commit -m "feat(v4): 新增 slidePhotoSize 記憶狀態並傳入模板 view"
```

---

### Task 2: slide 模板照片可縮放容器

**Files:**
- Modify: `v4/js/templates/slide/index.js`（render 照片區）
- Modify: `v4/css/base.css`（簡報照片縮放樣式）

**Interfaces:**
- Consumes: `d.photos.before[0]`/`d.photos.after[0]`（照片物件，含 `id/w/h/previewDataUrl/dataUrl`）、`d.slidePhotoSize`（`{[photoId]:{w,h}}`）。
- Produces: `.slide-photo` + `.slide-photo-frame`（含 `data-slide-resize` 縮放手柄），尺寸依 `slidePhotoSize` 或預設。

- [ ] **Step 1: 修改 slide render 照片區**

Modify `v4/js/templates/slide/index.js`：`render` 內 `photoBlock`（第 74-79 行）改為：

```js
    const slidePhoto = (p, label)=>{
      if(!p) return "";
      const ratio = (p.w && p.h) ? p.h/p.w : 1;
      const sz = (d.slidePhotoSize && d.slidePhotoSize[p.id]) || null;
      const w = sz ? sz.w : 240;
      const h = sz ? sz.h : Math.max(40, Math.round(240*ratio));
      return '<div class="slide-photo"><span class="slide-photo-tag">'+label+'</span>'+
        '<div class="slide-photo-frame" data-slide-photo="'+esc(p.id)+'" style="width:'+w+'px;height:'+h+'px">'+
        '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+label+'">'+
        '<span class="resize-handle" data-slide-resize="'+esc(p.id)+'" title="調整尺寸"></span>'+
        "</div></div>";
    };
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+slidePhoto(photosBefore[0], "改善前")+slidePhoto(photosAfter[0], "改善後")+"</div>"
      : "";
```

- [ ] **Step 2: base.css 加樣式**

Modify `v4/css/base.css`：在 `.slide-page .slide-photo` 相關規則處（約第 168-172 行 `.slide-page .slide-photo`/`.slide-page .slide-photo img`/`.slide-page .slide-photo-tag`）調整。先讀取現行規則後，將 `.slide-page .slide-photo` 與 `.slide-page .slide-photo img` 兩條改為、並新增 frame/handle 規則：

```css
.slide-page .slide-photo{
  flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
}
.slide-page .slide-photo-frame{position:relative;overflow:hidden;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18)}
.slide-page .slide-photo-frame img{width:100%;height:100%;object-fit:contain;display:block}
.slide-page .slide-photo-frame .resize-handle{position:absolute;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;background:rgba(255,255,255,.5);border-top-left-radius:8px}
```
（保留 `.slide-page .slide-photo-tag` 既有規則不動。）

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/templates/slide/index.js`
Expected: exit 0。

- [ ] **Step 4: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-slide-photo.mjs
import slide from "../../v4/js/templates/slide/index.js";
const photos = { before:[{id:"p1",w:400,h:300,dataUrl:"data:image/jpeg;base64,AA=="}], after:[] };
const def = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{} });
console.log("DEFAULT_W240:", def.includes('width:240px'));
console.log("DEFAULT_H180:", def.includes('height:180px'));   // 300/400*240=180
const custom = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{ p1:{w:320,h:200} } });
console.log("CUSTOM_W320:", custom.includes('width:320px'));
console.log("CUSTOM_H200:", custom.includes('height:200px'));
console.log("HANDLE:", custom.includes('data-slide-resize="p1"'));
console.log("NO_BEFORE_FRAME_WHEN_EMPTY:", !def.includes('data-slide-resize="after"'));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 5: Commit**

```bash
git add v4/js/templates/slide/index.js v4/css/base.css
git commit -m "feat(v4): 簡報照片可縮放容器與縮放手柄"
```

---

### Task 3: bindDocument 綁定簡報照片縮放拖拽

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `state.slidePhotoSize`（Task 1）、`.slide-photo-frame`/`data-slide-resize`（Task 2）。
- Produces: slide 模板下拖拽縮放手柄即時更新 frame 尺寸，pointerup 寫入 `state.slidePhotoSize[photoId]`。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 第 329-349 行（既有 `.resize-handle` pointer 縮放實作）與 `bindDocument` 結尾、`doc.dataset.bound` 守衛位置。

- [ ] **Step 2: 加簡報縮放綁定**

Modify `v4/js/document.js`：在既有 `.resize-handle` 縮放區塊之後、`bindDocument` 內新增（沿用 pointer pattern，用 `data-slide-resize` 區分）：

```js
  /* 簡報照片縮放把手（Pointer Events） */
  if(getTemplate(state.template).id==="slide"){
    doc.addEventListener("pointerdown", e=>{
      const handle = e.target.closest("[data-slide-resize]");
      if(!handle) return;
      e.preventDefault();
      const id = handle.dataset.slideResize;
      const frame = handle.closest(".slide-photo-frame");
      if(!frame) return;
      const zone = frame.closest(".slide-photos");
      const maxW = zone ? Math.max(40, zone.clientWidth - 24) : 800;
      const startX = e.clientX, startY = e.clientY;
      const startW = frame.offsetWidth, startH = frame.offsetHeight;
      function onMove(ev){
        const w = Math.min(maxW, Math.max(40, startW + (ev.clientX - startX)));
        const h = Math.max(40, startH + (ev.clientY - startY));
        frame.style.width = w+"px";
        frame.style.height = h+"px";
      }
      function onUp(){
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        state.slidePhotoSize[id] = { w: frame.offsetWidth, h: frame.offsetHeight };
      }
      handle.setPointerCapture(e.pointerId);
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
  }
```

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/document.js`
Expected: exit 0。

- [ ] **Step 4: 手動驗證（瀏覽器）**

本專案無測試框架，此為 DOM pointer 互動；以瀏覽器手動驗證：
1. 開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器）。
2. 生成一頁簡報（或有照片的 slide 模板）。
3. 拖拽照片角落縮放手柄 → 照片即時變大/變小；最小 40px。
4. 切到其他模板再切回 → 簡報照片維持簡報自己的尺寸。
5. 刷新頁面 → 簡報照片恢復預設 240px。
6. 其他模板拖拽縮放仍正常。

- [ ] **Step 5: Commit**

```bash
git add v4/js/document.js
git commit -m "feat(v4): 簡報照片縮放手柄拖拽調整大小"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（記憶）→Task 1；2（render 容器）→Task 2；3（綁定）→Task 3；4（CSS）→Task 2。驗收 1-5 對應 Task 2 Step 4、Task 3 Step 4。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`state.slidePhotoSize`（Task 1 定義、Task 3 寫入）、`view.slidePhotoSize`（Task 1 傳入、Task 2 讀取 `d.slidePhotoSize`）、`data-slide-resize`（Task 2 產生、Task 3 綁定 `handle.dataset.slideResize`）、`.slide-photo-frame`（Task 2 產生、Task 3 `closest(".slide-photo-frame")`）各處一致。
