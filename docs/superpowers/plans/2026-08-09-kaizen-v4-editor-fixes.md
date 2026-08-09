# V4 圖片編輯器修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正圖片編輯器四個問題：文字大小可調整、還原一次退一步、旋轉即時顯示且座標正確、裁切真正生效並保留 crop。

**Architecture:** `editor.js` 新增 `fontSize` 變數與工具列滑桿；`pushUndo()` 移到每次變更前；`redraw()` 套用 `overlay.rotate` 與 `overlay.crop` 並由畫布尺寸反映，`toImg()` 做反向旋轉轉換；`applyCrop()` 保留 crop 絕對座標；`tools.js` 的 `cropOverlay()` 保留 crop 欄位、`drawOverlay()` 以畫面座標繪製 crop 外框。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/editor/editor.js`、`v4/js/editor/tools.js`、`v4/css/base.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 文字大小滑桿範圍 12–96px，預設 32；文字工具使用 `size:fontSize`。
- `pushUndo()` 一律在變更**前**呼叫（捕捉變更前狀態）。
- 旋轉：`redraw()` 依 `overlay.rotate` 旋轉並互換畫布寬高；`toImg()` 反向旋轉；`openEditor` 依「旋轉後＋裁切後尺寸」計算 scale，不再手動設畫布尺寸。
- 裁切：`applyCrop` 保留 `overlay.crop`（絕對座標）；`cropOverlay` 保留 crop 欄位；`drawOverlay` 以 (0,0,w,h) 繪製 crop 外框；`redraw()` 只畫 `overlay.crop` 區域。
- 編輯工具列結構、色票、線寬、復原堆疊上限 50、完成／取消、`renderComposite()` 邏輯不變。
- 檔案編碼 UTF-8；不得加入無關程式碼；不得改動其他既有功能。

---

### Task 1: 文字大小控制

**Files:**
- Modify: `v4/js/editor/editor.js`（`fontSize` 變數、工具列 HTML、input 綁定、文字工具）
- Modify: `v4/css/base.css`（`.font-size-wrap`、range 樣式）

**Interfaces:**
- Produces: 模組層變數 `let fontSize=32;`；工具列 `#editorFontSize`（range 12–96）、`#editorFontSizeVal`；文字工具以 `size:fontSize` 建立文字。

- [ ] **Step 1: 加入 `fontSize` 變數**

Modify `v4/js/editor/editor.js`：將目前第 8 行
```js
let tool="rect", color="#EF4444", width=4;
```
改為
```js
let tool="rect", color="#EF4444", width=4, fontSize=32;
```

- [ ] **Step 2: 工具列加入字體大小控制**

Modify `v4/js/editor/editor.js` `initEditor` 內的 toolbar HTML（目前約第 28-36 行）：在色票 `<div class="color-swatches" id="editorSwatches">…</div>` 之後、`'<span class="sep"></span>'`（復原鈕前的分隔線）之前插入：
```js
      '<span class="sep"></span>'+
      '<label class="font-size-wrap">字<output id="editorFontSizeVal">32</output>px</label>'+
      '<input type="range" id="editorFontSize" min="12" max="96" step="1" value="32">'+
```

- [ ] **Step 3: 綁定滑桿事件**

Modify `v4/js/editor/editor.js`：在 `initEditor` 內、色票綁定區塊（`modal.querySelectorAll("[data-color]")…`）之後加入：
```js
  const fsRange=$("editorFontSize"), fsVal=$("editorFontSizeVal");
  fsRange.addEventListener("input",()=>{
    fontSize=parseInt(fsRange.value,10);
    fsVal.textContent=fontSize;
  });
```

- [ ] **Step 4: 文字工具改用 `fontSize`**

Modify `v4/js/editor/editor.js`：將目前第 67-71 行的文字工具
```js
    if(tool==="text"){
      const t=prompt("輸入文字：","");
      if(t){ editing.overlay.texts.push({ x:p.x, y:p.y, text:t, color, size:Math.max(14,width*6), bold:true }); pushUndo(); redraw(); }
      return;
    }
```
改為（順帶修正還原順序，見 Task 2，但此處一併完成）：
```js
    if(tool==="text"){
      const t=prompt("輸入文字：","");
      if(t){ pushUndo(); editing.overlay.texts.push({ x:p.x, y:p.y, text:t, color, size:fontSize, bold:true }); redraw(); }
      return;
    }
```

- [ ] **Step 5: base.css 加入字體大小控制樣式**

Modify `v4/css/base.css`：在 `.editor-toolbar .sep{…}` 規則之後加入：
```css
.font-size-wrap{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--muted);font-weight:600}
.font-size-wrap output{font-weight:700;color:var(--text);min-width:24px;text-align:center}
.editor-toolbar input[type=range]{width:70px;accent-color:var(--primary);cursor:pointer}
```

- [ ] **Step 6: 驗證語法與樣式**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。
重新讀取 `v4/css/base.css` 編輯器區段：三條新規則括號平衡。

- [ ] **Step 7: Commit**

```bash
git add v4/js/editor/editor.js v4/css/base.css
git commit -m "feat(v4): 編輯器文字大小可調整"
```

---

### Task 2: 還原修正（pushUndo 移到變更前）

**Files:**
- Modify: `v4/js/editor/editor.js`（`toolClear`、rotate、pointerdown、pointerup）

**Interfaces:**
- Produces: 所有 overlay 變更前先 `pushUndo()`；pointerup 不再 `pushUndo()`。

- [ ] **Step 1: 修正 `toolClear`**

Modify `v4/js/editor/editor.js`：將目前第 59 行
```js
  $("toolClear").addEventListener("click",()=>{ if(editing){ editing.overlay={rects:[],strokes:[],arrows:[],texts:[],crop:null,rotate:0}; pushUndo(); redraw(); } });
```
改為
```js
  $("toolClear").addEventListener("click",()=>{ if(editing){ pushUndo(); editing.overlay={rects:[],strokes:[],arrows:[],texts:[],crop:null,rotate:0}; redraw(); } });
```

- [ ] **Step 2: 修正 rotate**

Modify `v4/js/editor/editor.js`：將目前第 72 行
```js
    if(tool==="rotate"){ editing.overlay.rotate=((editing.overlay.rotate||0)+90)%360; pushUndo(); redraw(); return; }
```
改為
```js
    if(tool==="rotate"){ pushUndo(); editing.overlay.rotate=((editing.overlay.rotate||0)+90)%360; redraw(); return; }
```

- [ ] **Step 3: pointerdown 在建立 drawing 前 pushUndo**

Modify `v4/js/editor/editor.js`：將目前第 73-74 行
```js
    drawing={ sx:p.x, sy:p.y, cx:p.x, cy:p.y };
    if(tool==="draw"){ editing.overlay.strokes.push({ points:[p], color, width }); }
```
改為
```js
    pushUndo();
    drawing={ sx:p.x, sy:p.y, cx:p.x, cy:p.y };
    if(tool==="draw"){ editing.overlay.strokes.push({ points:[p], color, width }); }
```

- [ ] **Step 4: pointerup 移除 pushUndo**

Modify `v4/js/editor/editor.js`：將目前第 93 行
```js
    drawing=null; pushUndo(); redraw();
```
改為
```js
    drawing=null; redraw();
```

- [ ] **Step 5: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 6: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "fix(v4): 還原在變更前記錄狀態，一次退一步"
```

---

### Task 3: 旋轉修正（redraw 套用旋轉、toImg 反向、openEditor 縮放）

**Files:**
- Modify: `v4/js/editor/editor.js`（`redraw`、`toImg`、`openEditor`）

**Interfaces:**
- Consumes: `editing.overlay.rotate`（0/90/180/270）、`editing.overlay.crop`（可 null）。
- Produces: `redraw()` 依 rotate+crop 決定畫布寬高並繪製；`toImg(e)` 回傳影像座標系座標；`openEditor` 只設 `editing.scale`。

- [ ] **Step 1: 重寫 `redraw()`**

Modify `v4/js/editor/editor.js`：將目前 `redraw` 函式（第 117-136 行）整體替換為：
```js
function redraw(preview, d){
  const c=$("editorCanvas"), ctx=c.getContext("2d");
  const rot=((editing.overlay.rotate||0)%360);
  const rot90=rot%180===90;
  const crop=editing.overlay.crop;
  const iw=crop?crop.w:editing.img.width, ih=crop?crop.h:editing.img.height;
  const s=editing.scale;
  const cw=rot90?ih*s:iw*s, ch=rot90?iw*s:ih*s;
  if(c.width!==Math.round(cw)||c.height!==Math.round(ch)){ c.width=Math.round(cw); c.height=Math.round(ch); }
  ctx.clearRect(0,0,c.width,c.height);
  ctx.save();
  ctx.translate(c.width/2,c.height/2);
  ctx.rotate(rot*Math.PI/180);
  ctx.drawImage(editing.img, crop?crop.x:0, crop?crop.y:0, iw, ih, -iw*s/2, -ih*s/2, iw*s, ih*s);
  ctx.scale(s,s);
  ctx.translate(-iw/2,-ih/2);
  drawOverlay(ctx, editing.overlay);
  if(preview&&d){
    ctx.strokeStyle=color; ctx.lineWidth=width;
    if(tool==="rect"||tool==="crop"){
      const r={ x:Math.min(d.sx,d.cx), y:Math.min(d.sy,d.cy), w:Math.abs(d.cx-d.sx), h:Math.abs(d.cy-d.sy) };
      if(tool==="crop"){ ctx.strokeStyle="#DC2626"; ctx.setLineDash([6,4]); }
      ctx.strokeRect(r.x,r.y,r.w,r.h);
      ctx.setLineDash([]);
    }
    if(tool==="arrow"){ ctx.beginPath(); ctx.moveTo(d.sx,d.sy); ctx.lineTo(d.cx,d.cy); ctx.stroke(); }
  }
  ctx.restore();
}
```

- [ ] **Step 2: 重寫 `toImg()`**

Modify `v4/js/editor/editor.js`：將目前第 111-114 行
```js
function toImg(e){
  const r=$("editorCanvas").getBoundingClientRect(), s=editing.scale;
  return { x:(e.clientX-r.left-editing.offsetX)/s, y:(e.clientY-r.top-editing.offsetY)/s };
}
```
替換為：
```js
function toImg(e){
  const c=$("editorCanvas"), r=c.getBoundingClientRect();
  const rot=((editing.overlay.rotate||0)%360);
  const crop=editing.overlay.crop;
  const iw=crop?crop.w:editing.img.width, ih=crop?crop.h:editing.img.height;
  let x=e.clientX-r.left - c.width/2;
  let y=e.clientY-r.top - c.height/2;
  if(rot===90){ const t=x; x=y; y=-t; }
  else if(rot===180){ x=-x; y=-y; }
  else if(rot===270){ const t=x; x=-y; y=t; }
  return { x:x/editing.scale + iw/2, y:y/editing.scale + ih/2 };
}
```

- [ ] **Step 3: 修改 `openEditor` 縮放計算**

Modify `v4/js/editor/editor.js`：將目前 `openEditor` 內的尺寸計算區塊（約第 147-156 行）
```js
    $("editorModal").classList.add("show");
    const c=$("editorCanvas");
    const wrap=$("editorCanvasWrap");
    const maxW=(wrap?wrap.clientWidth:1200)-40;
    const maxH=(wrap?wrap.clientHeight:760)-40;
    const MAX=4;
    let s=Math.min(MAX,maxW/img.width,maxH/img.height);
    if(s<=0) s=1;
    editing.scale=s;
    c.width=img.width*s; c.height=img.height*s;
    if(editing.overlay.rotate%180===90){ c.width=img.height*s; c.height=img.width*s; }
    redraw();
```
替換為：
```js
    $("editorModal").classList.add("show");
    const wrap=$("editorCanvasWrap");
    const crop=editing.overlay.crop;
    const rot=((editing.overlay.rotate||0)%360);
    const rot90=rot%180===90;
    const iw=crop?crop.w:img.width, ih=crop?crop.h:img.height;
    const fw=rot90?ih:iw, fh=rot90?iw:ih;
    const maxW=(wrap?wrap.clientWidth:1200)-40;
    const maxH=(wrap?wrap.clientHeight:760)-40;
    const MAX=4;
    let s=Math.min(MAX,maxW/fw,maxH/fh);
    if(s<=0) s=1;
    editing.scale=s;
    redraw();
```

- [ ] **Step 4: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 5: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "fix(v4): 編輯器旋轉即時顯示且座標正確"
```

---

### Task 4: 裁切修正（保留 crop、繪製裁切區域）

**Files:**
- Modify: `v4/js/editor/editor.js`（`applyCrop`）
- Modify: `v4/js/editor/tools.js`（`cropOverlay`、`drawOverlay`）

**Interfaces:**
- Consumes: `overlay.crop`（絕對座標，可 null）。
- Produces: `applyCrop` 保留 `overlay.crop={x,y,w,h}`（絕對座標）並平移既有疊加物件；`cropOverlay` 保留 crop 欄位；`drawOverlay` 以 (0,0,w,h) 繪製 crop 外框。

- [ ] **Step 1: 修改 `applyCrop`**

Modify `v4/js/editor/editor.js`：將目前 `applyCrop`（第 173-180 行）
```js
function applyCrop(r){
  if(!r||r.w<10||r.h<10) return;
  const x=Math.max(0,Math.round(r.x)), y=Math.max(0,Math.round(r.y));
  const w=Math.min(editing.img.width-x, Math.round(r.w)), h=Math.min(editing.img.height-y, Math.round(r.h));
  if(w<10||h<10) return;
  editing.overlay.crop={x,y,w,h};
  editing.overlay=cropOverlay(editing.overlay, {x,y,w,h});
}
```
替換為：
```js
function applyCrop(r){
  if(!r||r.w<10||r.h<10) return;
  const base=editing.overlay.crop;
  const bx=base?base.x:0, by=base?base.y:0;
  const x=Math.max(0,Math.round(r.x)), y=Math.max(0,Math.round(r.y));
  const w=Math.min((base?base.w:editing.img.width)-x, Math.round(r.w));
  const h=Math.min((base?base.h:editing.img.height)-y, Math.round(r.h));
  if(w<10||h<10) return;
  const shifted=cropOverlay(editing.overlay, {x,y,w,h});
  shifted.crop={ x:bx+x, y:by+y, w, h };
  editing.overlay=shifted;
  redraw();
}
```

- [ ] **Step 2: `cropOverlay` 保留 crop 欄位**

Modify `v4/js/editor/tools.js`：將目前 `cropOverlay`（第 36-44 行）的回傳物件
```js
  const o={ rects:[], strokes:[], arrows:[], texts:[], rotate:overlay.rotate||0 };
```
改為
```js
  const o={ rects:[], strokes:[], arrows:[], texts:[], rotate:overlay.rotate||0, crop:overlay.crop||null };
```

- [ ] **Step 3: `drawOverlay` 以畫面座標繪製 crop 外框**

Modify `v4/js/editor/tools.js`：將目前 `drawOverlay` 的 crop 區塊（第 29-33 行）
```js
  if(overlay.crop){
    ctx.strokeStyle="#DC2626"; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(overlay.crop.x,overlay.crop.y,overlay.crop.w,overlay.crop.h);
    ctx.setLineDash([]);
  }
```
改為
```js
  if(overlay.crop){
    ctx.strokeStyle="#DC2626"; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(0,0,overlay.crop.w,overlay.crop.h);
    ctx.setLineDash([]);
  }
```

- [ ] **Step 4: 驗證語法**

Run: `node --check v4/js/editor/editor.js`、`node --check v4/js/editor/tools.js`
Expected: 兩者皆 exit 0，無輸出。

- [ ] **Step 5: Commit**

```bash
git add v4/js/editor/editor.js v4/js/editor/tools.js
git commit -m "fix(v4): 編輯器裁切真正生效並保留 crop"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件四節（文字大小→Task 1、還原→Task 2、旋轉→Task 3、裁切→Task 4），驗收標準 1-5 對應各 Task 之手動驗證步驟。無遺漏。
2. **Placeholder 掃描**：無 TBD／「implement later」；每個 code step 皆含完整程式碼。
3. **型別一致性**：`fontSize`（Task 1）供文字工具使用；`overlay.crop={x,y,w,h}`（絕對座標）在 Task 3（redraw/toImg 讀取）、Task 4（applyCrop 寫入）一致；`pushUndo()` 語意統一為「變更前記錄」；`toImg` 回傳影像座標系座標在 Task 3 與既有 pointerdown/pointermove 一致。
