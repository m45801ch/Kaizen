# V4 簡報照片自由縮放＋一鍵恢復原尺寸 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一頁簡報照片縮放改為自由改變寬高（圖片隨容器變形，同通用模板），並新增「⟳ 恢復原尺寸」按鈕回到寬 240px、高按原圖比例。

**Architecture:** `base.css` 改 `object-fit:fill`（圖隨容器拉伸）；`slide/index.js` render 照片加 `data-slide-reset-size` 恢復按鈕；`document.js` 新增恢復 click handler（算原圖比例尺寸、寫 `state.slidePhotoSize`）、並在照片拖拽/縮放/調層 handler 排除該按鈕。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/js/document.js`、`v4/css/base.css`。

## Global Constraints

- `state.slidePhotoSize` memory-only；恢復尺寸 = 寬 240px、高 `Math.max(40, Math.round(240*(p.h/p.w)))`（`p.w/p.h` 為原圖寬高；無則 `h=40`）。
- `object-fit:fill`：圖片填滿 frame 並隨容器拉伸變形。
- 恢復按鈕 `data-slide-reset-size`；照片拖拽/縮放/調層 handler 需排除該按鈕。
- 監聽採「無條件註冊 + 事件時檢查 `getTemplate(state.template).id!=="slide"` return」。
- 照片機制（拖拽/縮放/調層）其他部分不變；其他模板不變。
- 檔案 UTF-8；不得加入無關程式碼。

---

### Task 1: render 加恢復按鈕 + CSS object-fit fill

**Files:**
- Modify: `v4/js/templates/slide/index.js`（`slidePhoto`）
- Modify: `v4/css/base.css`

**Interfaces:**
- Produces: 照片含 `data-slide-reset-size` 按鈕；`.slide-photo-frame img` 用 `object-fit:fill`。

- [ ] **Step 1: render 加恢復按鈕**

Modify `v4/js/templates/slide/index.js`：`slidePhoto`（第 83-92 行）的調層按鈕區（第 88-91 行）加恢復按鈕：
```js
        '<span class="slide-z-btns">'+
          '<button type="button" data-slide-z="+1" title="上移一層">↑</button>'+
          '<button type="button" data-slide-z="-1" title="下移一層">↓</button>'+
          '<button type="button" data-slide-reset-size title="恢復原尺寸">⟳</button>'+
        "</span>"+
```

- [ ] **Step 2: CSS object-fit fill**

Modify `v4/css/base.css` 第 173 行：
```css
.slide-page .slide-photo-frame img{width:100%;height:100%;object-fit:fill;display:block}
```

- [ ] **Step 3: 驗證語法** Run: `node --check v4/js/templates/slide/index.js`（exit 0）

- [ ] **Step 4: Node 驗證輸出**

```js
// 暫存檔 .superpowers/sdd/test-free-resize.mjs
import slide from "../../v4/js/templates/slide/index.js";
const photos = { before:[{id:"p1",w:400,h:300,dataUrl:"data:image/jpeg;base64,AA=="}], after:[] };
const h = slide.render({ slide:{slideTitle:"t",keyPoints:[],benefits:[],conclusion:"c"}, photos, slidePhotoSize:{}, slidePhotoPos:{}, slideZ:{} });
console.log("RESET_BTN:", h.includes('data-slide-reset-size'));
console.log("RESET_TITLE:", h.includes('恢復原尺寸'));
console.log("ZBTNS_INTACT:", h.includes('data-slide-z="+1"'));
```
執行確認全部 `true` 後刪除暫存檔。

- [ ] **Step 5: Commit** `git commit -m "feat(v4): 簡報照片恢復原尺寸按鈕與自由縮放顯示"`

---

### Task 2: bindDocument 恢復尺寸 handler + 排除衝突

**Files:**
- Modify: `v4/js/document.js`（`bindDocument`）

**Interfaces:**
- Consumes: `state.images`（找照片物件 `p.w/p.h`）、`state.slidePhotoSize`、`[data-slide-reset-size]`（Task 1）。
- Produces: 恢復 click handler 更新照片 frame 尺寸並寫 `state.slidePhotoSize`；照片拖拽/縮放/調層排除該按鈕。

- [ ] **Step 1: 讀取現況**

Read `v4/js/document.js` 照片拖拽（約 404-452 行）、縮放（約 368-402 行）、調層（約 454-470 行）handler 的排除清單。

- [ ] **Step 2: 排除清單加 data-slide-reset-size**

Modify `v4/js/document.js`：
(a) 照片拖拽 handler 排除清單加 `e.target.closest("[data-slide-reset-size]")`：
```js
    if(e.target.closest("[data-slide-resize]")||e.target.closest("[data-slide-z]")||e.target.closest("[data-slide-reset-size]")) return;
```
(b) 照片縮放 handler（`[data-slide-resize]`，第 371 行起）— 手柄按鈕不含 reset，不需改。
(c) 照片調層 handler（`[data-slide-z]` click）— 不需改。

- [ ] **Step 3: 新增恢復尺寸 handler**

Modify `v4/js/document.js`：在照片調層 handler 之後新增：
```js
  /* 簡報照片恢復原尺寸 */
  doc.addEventListener("click", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const btn = e.target.closest("[data-slide-reset-size]");
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const photo = btn.closest("[data-slide-pos]");
    if(!photo) return;
    const id = photo.dataset.slidePos;
    const frame = photo.querySelector(".slide-photo-frame");
    if(!frame) return;
    let p = null;
    ["before","after"].forEach(side=>{
      const found = state.images[side].find(x=>x.id===id);
      if(found) p = found;
    });
    const w = 240;
    const h = p && p.w && p.h ? Math.max(40, Math.round(240*(p.h/p.w))) : 40;
    frame.style.width = w+"px";
    frame.style.height = h+"px";
    state.slidePhotoSize[id] = { w, h };
  });
```

- [ ] **Step 4: 驗證語法** Run: `node --check v4/js/document.js`（exit 0）

- [ ] **Step 5: 手動驗證（瀏覽器）**

本專案無測試框架，此為 DOM pointer/click 互動；以瀏覽器手動驗證（既有慣例）：
1. 生成一頁簡報（或有照片的 slide 模板）。
2. 拖照片縮放手柄 → 圖片隨容器拉伸變形（不維持比例）。
3. 點「⟳ 恢復原尺寸」→ 回到寬 240px、高按原圖比例。
4. 恢復後仍可自由縮放、可拖動、可調層。
5. 刷新恢復預設。
6. 其他模板照片機制不受影響。

- [ ] **Step 6: Commit** `git commit -m "feat(v4): 簡報照片一鍵恢復原尺寸"`

---

## Self-Review 結果

1. **Spec 覆蓋率**：spec 二節 1（object-fit fill）→Task 1；2（恢復按鈕）→Task 1；3（恢復 handler）→Task 2；不變項目維持。驗收 1-6 對應 Task 1 Step 4、Task 2 Step 5。無遺漏。
2. **Placeholder 掃描**：無 TBD；每 code step 皆完整。
3. **型別一致性**：`data-slide-reset-size`（Task 1 產生、Task 2 `closest`）、`state.slidePhotoSize[id]`（Task 2 寫入、Task 1 render 讀 `d.slidePhotoSize[p.id]`）、`state.images.before/after`（Task 2 讀照片 `p.w/p.h`）、`.slide-photo-frame`（Task 1 產生、Task 2 `querySelector`）各處一致。
