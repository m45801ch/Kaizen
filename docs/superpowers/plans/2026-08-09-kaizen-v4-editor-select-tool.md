# V4 圖片編輯器「選擇/移動」工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「選擇」工具，讓所有疊加物件（文字/圖框/箭頭/塗鴉）可選取、移動，並支援文字旋轉、圖框縮放、箭頭端點拖動、塗鴉逐點編輯。

**Architecture:** 新增模組層 `selected`/`selDrag` 狀態與 `hitTest`/`textRect`/`distToSeg`/`drawSelection`/`startSelect`/`selectMove` 等函式；選擇工具的 pointer 事件與現有繪製工具分流；文字物件加 `angle` 欄位（drawOverlay/renderComposite 套用、cropOverlay 保留）；把手繪製在 redraw 的既有轉換座標空間內。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/editor/editor.js`、`v4/js/editor/tools.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 選擇工具為預設 active；`[data-tool]` 點擊切換工具時 `selected=null`。
- 每次操作（移動/縮放/旋轉/拖端點/拖點）在 pointerdown 時 `pushUndo()` 一次；一次還原退一步。
- 操作座標全部用現有 `toImg(e)`（目前畫面座標系）；把手繪製在 `redraw()` 內 `drawOverlay` 之後、`ctx.restore()` 之前（已 scale，故把手尺寸須除以 `editing.scale`）。
- 文字 `angle` 預設 0（讀取用 `t.angle||0`）；繪製順時針度數。
- 圖框縮放最小 10px；命中門檻約 8px（除以 `editing.scale` 換算）。
- `svgIcon()`、`redraw()` 座標核心、`toImg()`、`renderComposite()` 整體邏輯、繪製工具行為不動（僅在需要處擴充）。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 文字 angle 支援（繪製與輸出）

**Files:**
- Modify: `v4/js/editor/tools.js`（`drawOverlay` 文字區塊）
- Modify: `v4/js/editor/editor.js`（`renderComposite` 文字繪製）

**Interfaces:**
- Consumes: `texts[]` 每個物件可含 `angle`（度，預設 0）。
- Produces: 文字以順時針 `angle` 旋轉繪製（anchor 為 (x,y)，`textBaseline="top"`）；cropOverlay 平移文字時自動保留 angle。

- [ ] **Step 1: `drawOverlay` 文字套用 angle**

Modify `v4/js/editor/tools.js`：將目前 `drawOverlay` 的文字區塊（第 24-28 行）
```js
  (overlay.texts||[]).forEach(t=>{
    ctx.font=(t.bold?"700 ":"")+t.size+"px sans-serif";
    ctx.fillStyle=t.color; ctx.textBaseline="top";
    ctx.fillText(t.text, t.x, t.y);
  });
```
替換為：
```js
  (overlay.texts||[]).forEach(t=>{
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(((t.angle||0)*Math.PI/180));
    ctx.font=(t.bold?"700 ":"")+t.size+"px sans-serif";
    ctx.fillStyle=t.color; ctx.textBaseline="top";
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  });
```

- [ ] **Step 2: `cropOverlay` 確認保留 angle**

Modify `v4/js/editor/tools.js`：目前 `cropOverlay` 的文字平移（第 43 行）
```js
  (overlay.texts||[]).forEach(t=>o.texts.push({...t, x:t.x-crop.x, y:t.y-crop.y }));
```
已用展開運算子保留 `angle`，**不需改動**。Step 1 後重新讀取確認。

- [ ] **Step 3: `renderComposite` 文字套用 angle**

Modify `v4/js/editor/editor.js`：在 `renderComposite` 內、`drawOverlay(ctx, ov);` 呼叫之前，插入獨立的文字繪製（renderComposite 共用 drawOverlay，但需確認 drawOverlay 已含 angle——因 renderComposite 呼叫的是 tools.js 的 drawOverlay，Step 1 已涵蓋）。此步驟僅確認 `renderComposite` 走 drawOverlay，不需改動。

- [ ] **Step 4: 驗證語法**

Run: `node --check v4/js/editor/tools.js`、`node --check v4/js/editor/editor.js`
Expected: 兩者皆 exit 0。

- [ ] **Step 5: Commit**

```bash
git add v4/js/editor/tools.js
git commit -m "feat(v4): 文字支援任意角度旋轉"
```

---

### Task 2: 選擇工具核心（選取 + 移動所有物件）

**Files:**
- Modify: `v4/js/editor/editor.js`

**Interfaces:**
- Consumes: `tool`（"select"）、`editing.overlay`。
- Produces: 模組層 `let selected=null; let selDrag=null;`；`hitTest(p)` 回傳 `{type,index}|null`；`textRect(t)` 回傳文字 bounding box；`distToSeg`；`drawSelection(ctx)`；`startSelect(p)`；`selectMove(e)`；pointer 事件分流。

- [ ] **Step 1: 新增 `select` 工具並設為預設**

Modify `v4/js/editor/editor.js`：將第 8 行
```js
let tool="rect", color="#EF4444", width=4, fontSize=32;
```
改為
```js
let tool="select", color="#EF4444", width=4, fontSize=32;
let selected=null;   // { type:"text"|"rect"|"arrow"|"stroke", index }
let selDrag=null;    // { mode, start, handle?, which?, pi? }
```

Modify `TOOLS` 陣列（第 11-18 行）：在 `["rect",...]` 之前加入 select 項：
```js
  ["select","選擇",'<path d="M4 3l7 18l2.5-6.5L20 14z"/>'],
```

Modify 工具列建構（第 30 行）：`id==="rect"` 的 active 判斷改為 `id==="select"`：
```js
      TOOLS.map(([id,name,ic])=>'<button type="button" class="tool'+(id==="select"?" active":"")+'" data-tool="'+id+'" title="'+name+'">'+svgIcon(ic)+"</button>").join("")+
```

Modify `[data-tool]` 點擊處理（第 52-57 行）：切換工具時清空選取：
```js
  modal.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    if(b.dataset.tool==="rotate"){ rotateImage(); return; }
    tool=b.dataset.tool;
    selected=null; selDrag=null;
    modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));
    updateHint();
  }));
```

Modify `updateHint`（第 115-118 行）的 hints 物件：
```js
  const hints={select:"點選物件後拖曳調整",rect:"拖曳以繪製框線",draw:"按住拖曳以塗鴉",arrow:"拖曳以繪製箭頭",text:"點擊加入文字",crop:"拖曳選取要保留的區域"};
```

- [ ] **Step 2: 新增輔助函式**

Modify `v4/js/editor/editor.js`：在 `fromImg`（第 132 行）之後插入：

```js
function distToSeg(p,a,b){
  const dx=b.x-a.x, dy=b.y-a.y, L2=dx*dx+dy*dy;
  let t=0;
  if(L2>0) t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/L2));
  return Math.hypot(p.x-(a.x+t*dx), p.y-(a.y+t*dy));
}
function textRect(t){
  const c=$("editorCanvas"), ctx=c.getContext("2d");
  ctx.font=(t.bold?"700 ":"")+t.size+"px sans-serif";
  return { x:t.x, y:t.y, w:ctx.measureText(t.text).width, h:t.size };
}
function hitTest(p){
  const ov=editing.overlay, T=8/editing.scale;
  for(let i=ov.texts.length-1;i>=0;i--){
    const r=textRect(ov.texts[i]);
    if(p.x>=r.x-T&&p.x<=r.x+r.w+T&&p.y>=r.y-T&&p.y<=r.y+r.h+T) return {type:"text",index:i};
  }
  for(let i=ov.rects.length-1;i>=0;i--){
    const r=ov.rects[i];
    if(p.x>=r.x-T&&p.x<=r.x+r.w+T&&p.y>=r.y-T&&p.y<=r.y+r.h+T) return {type:"rect",index:i};
  }
  for(let i=ov.strokes.length-1;i>=0;i--){
    const pts=ov.strokes[i].points;
    for(let j=0;j<pts.length-1;j++) if(distToSeg(p,pts[j],pts[j+1])<T) return {type:"stroke",index:i};
  }
  for(let i=ov.arrows.length-1;i>=0;i--){
    const a=ov.arrows[i];
    if(distToSeg(p,{x:a.x1,y:a.y1},{x:a.x2,y:a.y2})<T) return {type:"arrow",index:i};
  }
  return null;
}
function selObj(){
  if(!selected) return null;
  const arr=editing.overlay[selected.type==="stroke"?"strokes":selected.type+"s"];
  return arr?arr[selected.index]:null;
}
```

- [ ] **Step 3: 新增選擇操作函式（本版僅移動）**

Modify `v4/js/editor/editor.js`：在 `applyCrop`（第 204 行附近）之後插入：

```js
function applyMove(dx,dy){
  const o=selObj(); if(!o) return;
  if(selected.type==="text"){ o.x+=dx; o.y+=dy; }
  else if(selected.type==="rect"){ o.x+=dx; o.y+=dy; }
  else if(selected.type==="arrow"){ o.x1+=dx; o.y1+=dy; o.x2+=dx; o.y2+=dy; }
  else if(selected.type==="stroke"){ o.points.forEach(pt=>{ pt.x+=dx; pt.y+=dy; }); }
}
function startSelect(p){
  const ov=editing.overlay;
  const hit=hitTest(p);
  if(!hit){ selected=null; selDrag=null; redraw(); return; }
  selected=hit;
  pushUndo();
  selDrag={ mode:"move", start:{x:p.x,y:p.y} };
  redraw();
}
function selectMove(e){
  if(!selDrag) return;
  const p=toImg(e);
  if(selDrag.mode==="move"){
    applyMove(p.x-selDrag.start.x, p.y-selDrag.start.y);
    selDrag.start={x:p.x,y:p.y};
  }
  redraw();
}
function selectEnd(){
  selDrag=null;
  redraw();
}
```

- [ ] **Step 4: pointer 事件分流**

Modify `v4/js/editor/editor.js`：
(a) pointerdown（第 73 行）在 `const p=toImg(e);` 之後、`if(tool==="text")` 之前插入：
```js
    if(tool==="select"){ startSelect(p); return; }
```
(b) pointermove（第 86 行）在 `if(!drawing) return;` 之前插入：
```js
    if(tool==="select"){ selectMove(e); return; }
```
(c) pointerup（第 95 行）在 `if(!drawing) return;` 之前插入：
```js
    if(tool==="select"){ selectEnd(); return; }
```

- [ ] **Step 5: `drawSelection` 與 `redraw` 整合（本版繪製虛線選取框）**

Modify `v4/js/editor/editor.js`：在 `redraw` 函式（第 134 行附近）的 `drawOverlay(ctx, editing.overlay);` 之後、`if(preview&&d){` 之前插入：

```js
  drawSelection(ctx);
```

並在 `redraw` 函式之後新增：

```js
function drawSelection(ctx){
  const o=selObj();
  if(!o||tool!=="select") return;
  ctx.strokeStyle="#2563EB";
  ctx.lineWidth=1.5/editing.scale;
  ctx.setLineDash([6/editing.scale,4/editing.scale]);
  if(selected.type==="text"){
    const r=textRect(o);
    ctx.save();
    ctx.translate(o.x,o.y);
    ctx.rotate(((o.angle||0)*Math.PI/180));
    ctx.strokeRect(0,0,r.w,r.h);
    ctx.restore();
  } else if(selected.type==="rect"){
    ctx.strokeRect(o.x,o.y,o.w,o.h);
  } else if(selected.type==="arrow"){
    ctx.beginPath(); ctx.moveTo(o.x1,o.y1); ctx.lineTo(o.x2,o.y2); ctx.stroke();
  } else if(selected.type==="stroke"){
    const xs=o.points.map(p=>p.x), ys=o.points.map(p=>p.y);
    const x0=Math.min(...xs), y0=Math.min(...ys), x1=Math.max(...xs), y1=Math.max(...ys);
    ctx.strokeRect(x0,y0,x1-x0,y1-y0);
  }
  ctx.setLineDash([]);
}
```

注意：`drawSelection` 在 `redraw` 內、`scale(s)` 後呼叫，故座標為畫面座標系、尺寸須除以 `editing.scale`。

- [ ] **Step 6: `closeEditor` 清空選取狀態**

Modify `v4/js/editor/editor.js` `closeEditor`（第 191 行附近）：
```js
function closeEditor(){
  $("editorModal").classList.remove("show");
  current=null; editing=null;
}
```
改為：
```js
function closeEditor(){
  $("editorModal").classList.remove("show");
  current=null; editing=null; selected=null; selDrag=null;
}
```

- [ ] **Step 7: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 8: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 選擇工具可選取並移動疊加物件"
```

---

### Task 3: 文字旋轉把手 + 圖框縮放把手

**Files:**
- Modify: `v4/js/editor/editor.js`

**Interfaces:**
- Consumes: `selected`/`selDrag`、`textRect`、`selObj`（Task 2）。
- Produces: `startSelect` 增加把手偵測；`selectMove` 增加 `rotate`/`resize` 模式；`drawSelection` 繪製文字旋轉把手與圖框 8 把手。

- [ ] **Step 1: `startSelect` 加入把手偵測**

Modify `v4/js/editor/editor.js`：將 `startSelect`（Task 2 版）整體替換為：

```js
function startSelect(p){
  const ov=editing.overlay, T=12/editing.scale;
  if(selected){
    const o=selObj();
    if(o){
      if(selected.type==="text"){
        const r=textRect(o);
        const a=(o.angle||0)*Math.PI/180;
        const ox=r.w/2, oy=-20/editing.scale;
        const hx=o.x+ox*Math.cos(a)-oy*Math.sin(a);
        const hy=o.y+ox*Math.sin(a)+oy*Math.cos(a);
        if(Math.hypot(p.x-hx,p.y-hy)<T){ pushUndo(); selDrag={mode:"rotate"}; redraw(); return; }
      } else if(selected.type==="rect"){
        const h=rectHandleAt(p);
        if(h){ pushUndo(); selDrag={mode:"resize",handle:h}; redraw(); return; }
      } else if(selected.type==="arrow"){
        if(Math.hypot(p.x-o.x1,p.y-o.y1)<T){ pushUndo(); selDrag={mode:"endpoint",which:"a"}; redraw(); return; }
        if(Math.hypot(p.x-o.x2,p.y-o.y2)<T){ pushUndo(); selDrag={mode:"endpoint",which:"b"}; redraw(); return; }
      } else if(selected.type==="stroke"){
        for(let j=0;j<o.points.length;j++){
          if(Math.hypot(p.x-o.points[j].x,p.y-o.points[j].y)<T){ pushUndo(); selDrag={mode:"point",pi:j}; redraw(); return; }
        }
      }
    }
  }
  const hit=hitTest(p);
  if(!hit){ selected=null; selDrag=null; redraw(); return; }
  selected=hit;
  pushUndo();
  selDrag={ mode:"move", start:{x:p.x,y:p.y} };
  redraw();
}
```

- [ ] **Step 2: 新增 `rectHandleAt`**

Modify `v4/js/editor/editor.js`：在 `startSelect` 之後插入：

```js
function rectHandleAt(p){
  const o=selObj(); if(!o) return null;
  const T=10/editing.scale;
  const hs=5/editing.scale;
  const corners={ nw:[o.x,o.y], n:[o.x+o.w/2,o.y], ne:[o.x+o.w,o.y],
                  w:[o.x,o.y+o.h/2], e:[o.x+o.w,o.y+o.h/2],
                  sw:[o.x,o.y+o.h], s:[o.x+o.w/2,o.y+o.h], se:[o.x+o.w,o.y+o.h] };
  for(const k in corners){
    const [hx,hy]=corners[k];
    if(Math.hypot(p.x-hx,p.y-hy)<T+hs) return k;
  }
  return null;
}
```

- [ ] **Step 3: `selectMove` 支援 rotate/resize**

Modify `v4/js/editor/editor.js`：將 `selectMove`（Task 2 版）整體替換為：

```js
function selectMove(e){
  if(!selDrag) return;
  const p=toImg(e);
  const o=selObj(); if(!o) return;
  if(selDrag.mode==="move"){
    applyMove(p.x-selDrag.start.x, p.y-selDrag.start.y);
    selDrag.start={x:p.x,y:p.y};
  } else if(selDrag.mode==="rotate"){
    o.angle=Math.round(Math.atan2(p.y-o.y, p.x-o.x)*180/Math.PI);
  } else if(selDrag.mode==="resize"){
    applyResize(p, selDrag.handle);
  }
  redraw();
}
function applyResize(p, h){
  const o=selObj(); if(!o) return;
  const MIN=10;
  let x1=o.x, y1=o.y, x2=o.x+o.w, y2=o.y+o.h;
  if(h.indexOf("w")!==-1) x1=p.x;
  if(h.indexOf("e")!==-1) x2=p.x;
  if(h.indexOf("n")!==-1) y1=p.y;
  if(h.indexOf("s")!==-1) y2=p.y;
  if(x2-x1<MIN||y2-y1<MIN) return;
  o.x=x1; o.y=y1; o.w=x2-x1; o.h=y2-y1;
}
```

- [ ] **Step 4: `drawSelection` 繪製把手**

Modify `v4/js/editor/editor.js`：將 `drawSelection`（Task 2 版）整體替換為：

```js
function drawSelection(ctx){
  const o=selObj();
  if(!o||tool!=="select") return;
  ctx.strokeStyle="#2563EB";
  ctx.lineWidth=1.5/editing.scale;
  ctx.setLineDash([6/editing.scale,4/editing.scale]);
  if(selected.type==="text"){
    const r=textRect(o);
    ctx.save();
    ctx.translate(o.x,o.y);
    ctx.rotate(((o.angle||0)*Math.PI/180));
    ctx.strokeRect(0,0,r.w,r.h);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(r.w/2,-20/editing.scale,4/editing.scale,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  } else if(selected.type==="rect"){
    ctx.strokeRect(o.x,o.y,o.w,o.h);
    ctx.setLineDash([]);
    const hs=5/editing.scale;
    [[o.x,o.y],[o.x+o.w/2,o.y],[o.x+o.w,o.y],[o.x,o.y+o.h/2],[o.x+o.w,o.y+o.h/2],[o.x,o.y+o.h],[o.x+o.w/2,o.y+o.h],[o.x+o.w,o.y+o.h]].forEach(([hx,hy])=>{
      ctx.fillStyle="#fff"; ctx.fillRect(hx-hs/2,hy-hs/2,hs,hs);
      ctx.strokeRect(hx-hs/2,hy-hs/2,hs,hs);
    });
  } else if(selected.type==="arrow"){
    ctx.beginPath(); ctx.moveTo(o.x1,o.y1); ctx.lineTo(o.x2,o.y2); ctx.stroke();
    ctx.setLineDash([]);
    [[o.x1,o.y1],[o.x2,o.y2]].forEach(([hx,hy])=>{
      ctx.beginPath(); ctx.arc(hx,hy,4/editing.scale,0,Math.PI*2); ctx.stroke();
    });
  } else if(selected.type==="stroke"){
    const xs=o.points.map(p=>p.x), ys=o.points.map(p=>p.y);
    const x0=Math.min(...xs), y0=Math.min(...ys), x1=Math.max(...xs), y1=Math.max(...ys);
    ctx.strokeRect(x0,y0,x1-x0,y1-y0);
    ctx.setLineDash([]);
    o.points.forEach(pt=>{ ctx.beginPath(); ctx.arc(pt.x,pt.y,3/editing.scale,0,Math.PI*2); ctx.stroke(); });
  }
}
```

- [ ] **Step 5: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 6: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 文字旋轉把手與圖框縮放把手"
```

---

### Task 4: 箭頭端點 + 塗鴉逐點編輯

**Files:**
- Modify: `v4/js/editor/editor.js`

**Interfaces:**
- Consumes: `selected`/`selDrag`（mode `endpoint`/`point`）、`rectHandleAt`（Task 3）。
- Produces: `selectMove` 支援 `endpoint`/`point` 模式。

- [ ] **Step 1: `selectMove` 支援 endpoint/point**

Modify `v4/js/editor/editor.js`：將 `selectMove`（Task 3 版）整體替換為：

```js
function selectMove(e){
  if(!selDrag) return;
  const p=toImg(e);
  const o=selObj(); if(!o) return;
  if(selDrag.mode==="move"){
    applyMove(p.x-selDrag.start.x, p.y-selDrag.start.y);
    selDrag.start={x:p.x,y:p.y};
  } else if(selDrag.mode==="rotate"){
    o.angle=Math.round(Math.atan2(p.y-o.y, p.x-o.x)*180/Math.PI);
  } else if(selDrag.mode==="resize"){
    applyResize(p, selDrag.handle);
  } else if(selDrag.mode==="endpoint"){
    if(selDrag.which==="a"){ o.x1=p.x; o.y1=p.y; }
    else { o.x2=p.x; o.y2=p.y; }
  } else if(selDrag.mode==="point"){
    const pt=o.points[selDrag.pi];
    if(pt){ pt.x=p.x; pt.y=p.y; }
  }
  redraw();
}
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 3: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 箭頭端點拖動與塗鴉逐點編輯"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件五節（選擇工具→Task 2、資料模型→Task 1+2、各物件操作→Task 3+4、座標繪製→Task 1/2/3、驗收 1-6→各 Task 手動驗證）。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`selected={type,index}`、`selDrag={mode,start,handle,which,pi}` 在各 Task 一致；`textRect`/`hitTest`/`selObj`/`applyMove`/`applyResize`/`rectHandleAt`/`drawSelection`/`startSelect`/`selectMove`/`selectEnd` 命名一致；`angle` 在 Task 1（繪製）與 Task 3（旋轉寫入）一致。
